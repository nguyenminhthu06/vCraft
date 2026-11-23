# vCraft Demo Bát Tràng

Giải nén toàn bộ thư mục rồi mở `index.html` bằng Chrome, Edge hoặc Firefox. Bản demo dùng HTML, CSS và JavaScript thuần. Chế độ mở tệp hỗ trợ thử các luồng nghiệp vụ ngoại tuyến.

## Thử đơn 5.000 cốc

1. Vào **Khu vực demo**, chọn **Khách hàng** và mở yêu cầu có sẵn **5.000 cốc gốm in logo**. So sánh hai báo giá rồi chấp nhận một chào giá.
2. Chuyển sang **Ban quản lý**. Lưu 3.000 cốc cho Xưởng Gốm An Thổ. Thử phân 2.001 cốc cho Nhà Gốm Lam để thấy hệ thống từ chối, rồi lưu đúng 2.000 cốc. Chọn **Bắt đầu sản xuất**.
3. Chuyển sang **Hộ nghề / Nghệ nhân** và chọn lần lượt từng xưởng. Với mỗi xưởng, chọn **Bắt đầu phần việc** rồi **Hoàn thành phần việc**.
4. Quay về vai trò **Khách hàng**. Đơn hiển thị **Đã giao** sau khi cả hai xưởng hoàn thành.

## Thử trang công khai

### Bật nền đường phố Mapbox

Điền public token bắt đầu bằng `pk.` vào `mapboxToken` trong `maps-config.js`. Chạy `node server.js` và mở `http://127.0.0.1:8787/#village`. Nếu token có giới hạn URL, cho phép địa chỉ chạy demo và tên miền triển khai. Bản đồ tải Mapbox Streets khi có token và kết nối. Khi thiếu token hoặc lỗi mạng, trang hiển thị bản đồ Bát Tràng lưu sẵn. Nút chỉ đường mở ứng dụng Google Maps riêng.

Mở **Bản đồ xưởng** từ thanh điều hướng để xem các xưởng trên cùng nền đường phố Mapbox khi đã cấu hình token. Tìm theo tên hoặc địa chỉ (có thể gõ không dấu), lọc trạng thái đón khách, rồi chọn **Định vị** trong danh sách. Chọn ghim để mở hồ sơ. Bản đồ hỗ trợ kéo, phóng to, thu nhỏ và đưa tất cả ghim đang lọc về khung nhìn. Khi thiếu kết nối, bản demo dùng lớp đường và sông Bát Tràng đóng gói trong bat-trang-streets.svg. Lớp lưu sẵn chỉ bao phủ khu vực demo và một phần mạng đường. Nền trực tuyến cung cấp chi tiết khi có mạng. Tọa độ xưởng là dữ liệu minh họa.

- Mở **Sản phẩm**, chọn **Cốc men mộc** rồi mở **Truy xuất BT-COC-001** để xem nhật ký lô.
- Mở **Làng nghề** và chọn ghim để xem mở cửa, hồ sơ và sản phẩm của xưởng.
- Để thử một RFQ từ đầu, tạo bản nháp với hạn nhận báo giá trong tương lai, chọn xưởng nhận, gửi yêu cầu rồi chuyển sang vai trò hộ nghề để chào giá.

## Thử nhật ký sản xuất

1. Vào **Khu vực demo → Hộ nghề / Nghệ nhân → Xưởng Gốm An Thổ**. Mục **Lô và nhật ký sản xuất** chứa lô đang làm **BT-BINH-002** và lô đã hoàn thành **BT-COC-001**.
2. Ở **BT-BINH-002**, chọn **Thêm mốc sản xuất**. Nhập công đoạn, thời điểm theo giờ Việt Nam và mô tả. Có thể chọn nhiều ảnh cùng lúc, tối đa 8 ảnh mỗi mốc và 5 MB mỗi tệp trước khi thu nhỏ. Thử thêm hai mốc với thời điểm khác nhau để xem thứ tự trên trang truy xuất.
3. Dùng **Sửa mốc hoặc thêm ảnh**, **Xóa ảnh** hoặc **Xóa mốc** để thử cập nhật. Chọn **Xem trang truy xuất và QR** để xem câu chuyện lô, sản phẩm, xưởng và quy trình.
4. Chọn **Hoàn thành lô**. Nhật ký chuyển sang chỉ đọc và trang truy xuất hiện mục **Thành phẩm cuối cùng**, kèm ảnh của mốc cuối nếu có. Đổi sang **Ban quản lý** và tìm **Nhật ký thao tác** để xem lịch sử.

## Quét QR bằng điện thoại

1. Trên máy tính có Node.js, mở terminal tại thư mục đã giải nén và chạy `node server.js --lan`.
2. Mở địa chỉ mạng mà terminal in ra trên máy tính. Kết nối điện thoại vào cùng mạng với máy tính. Lô mẫu có thể quét ngay từ trang truy xuất.
3. Với lô vừa tạo hoặc sửa, khi đang ở vai trò Nghệ nhân sở hữu lô, mở **Xem trang truy xuất và QR** rồi chọn **Cập nhật trang cho mã QR** trước khi quét. Sau khi sửa tiếp, dùng lại nút này. Máy chủ giữ bản công khai trong bộ nhớ đến khi dừng tiến trình. Dữ liệu chỉnh sửa lưu trong trình duyệt tại địa chỉ bạn dùng.

## Phạm vi

Dữ liệu minh họa và audit log lưu bằng localStorage trong trình duyệt. Demo mô phỏng ba vai trò và kiểm tra quyền sở hữu trong luồng nghiệp vụ. Máy chủ demo chia sẻ các trường công khai của lô qua mạng nội bộ. Xác thực tài khoản và MySQL thuộc phạm vi triển khai tiếp theo.

Lớp nền ngoại tuyến sử dụng dữ liệu © OpenStreetMap contributors (https://www.openstreetmap.org/copyright), theo Open Database License 1.0. Nguồn trích xuất: https://github.com/Maynard0211/hanoi-gis-map/tree/master/scripts .

