---
noteId: "a6864a049e1011f1acd17110d0996efc"
tags: []

---

# SonarQube local

SonarQube Community Build và PostgreSQL chạy hoàn toàn bằng Docker. Scanner cũng chạy trong container, nên máy host không cần cài Java hoặc SonarScanner.

## Yêu cầu

- Docker Desktop đang chạy (khuyến nghị cấp ít nhất 4 GB RAM cho Docker).
- Trên Linux, nếu Elasticsearch không khởi động được, đặt `vm.max_map_count=524288` theo hướng dẫn của SonarQube.

## Khởi động

Từ thư mục gốc project:

```bash
docker compose -f sonarqube/compose.yaml up -d sonarqube
```

Mở <http://localhost:9000>. Lần đăng nhập đầu tiên dùng `admin` / `admin`, sau đó SonarQube sẽ yêu cầu đổi mật khẩu.

Chờ trạng thái hệ thống sẵn sàng:

```bash
docker compose -f sonarqube/compose.yaml ps
```

## Tạo token và scan

Trong SonarQube, vào **My Account → Security**, tạo token rồi chạy:

PowerShell:

```powershell
$env:SONAR_TOKEN = "token-vừa-tạo"
docker compose -f sonarqube/compose.yaml --profile scan run --rm scanner
```

Bash/zsh:

```bash
SONAR_TOKEN="token-vừa-tạo" docker compose -f sonarqube/compose.yaml --profile scan run --rm scanner
```

Kết quả nằm tại <http://localhost:9000/dashboard?id=expense-tracker>.

Token chỉ tồn tại trong biến môi trường và không được ghi vào repository. Nếu scan báo `Not authorized`, kiểm tra lại `SONAR_TOKEN` và quyền Execute Analysis của token.

## Dừng hoặc xóa dữ liệu

```bash
docker compose -f sonarqube/compose.yaml down
```

Lệnh trên giữ lại database và cấu hình. Chỉ khi muốn xóa toàn bộ dữ liệu SonarQube để cài lại từ đầu, chạy:

```bash
docker compose -f sonarqube/compose.yaml down --volumes
```
