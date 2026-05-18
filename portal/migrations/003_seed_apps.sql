-- 003_seed_apps.sql
-- 5 demo apps cho CC Portal

INSERT OR IGNORE INTO apps (slug, name, description, icon, sort_order) VALUES
  ('quan-tri-nhan-su', 'Quản trị nhân sự',  'Quản lý hồ sơ nhân viên, chấm công, nghỉ phép', '👥', 10),
  ('hai-vi',           'Hải Vị',             'Quản lý sản phẩm và thương hiệu Hải Vị',         '🦐', 20),
  ('xuat-nhap-khau',   'Xuất nhập khẩu',     'Theo dõi đơn hàng, hợp đồng xuất nhập khẩu',    '🚢', 30),
  ('kho-lanh',         'Kho Lạnh',           'Quản lý tồn kho và nhiệt độ bảo quản',           '❄️', 40),
  ('kho-vat-tu',       'Kho vật tư',         'Quản lý vật tư, thiết bị và bao bì sản xuất',    '🔧', 50);
