import { config } from 'dotenv';
import pg from 'pg';
config({ path: '.env', quiet: true });
const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();
for (const [name, sql] of [
  ['doctors', `SELECT ck.ma_chuyen_khoa, ck.ten_chuyen_khoa, count(bs.id)::int AS doctors FROM chuyen_khoa ck LEFT JOIN bac_si bs ON bs.chuyen_khoa_id=ck.id AND bs.trang_thai='DANG_HOAT_DONG' GROUP BY ck.id ORDER BY ck.id`],
  ['staff', `SELECT vt.ma_vai_tro, count(DISTINCT ndvt.nguoi_dung_id)::int AS users FROM vai_tro vt LEFT JOIN nguoi_dung_vai_tro ndvt ON ndvt.vai_tro_id=vt.id GROUP BY vt.ma_vai_tro ORDER BY vt.ma_vai_tro`],
  ['units', `SELECT id,ma_don_vi,ten_don_vi,chuyen_khoa_id FROM don_vi_lam_viec ORDER BY id`],
  ['week_assignments', `SELECT dvlv.ma_don_vi,vt.ma_vai_tro,clv.ma_ca,pc.ngay_lam_viec::text,count(*)::int AS total,string_agg(nd.ho_ten,', ' ORDER BY nd.ho_ten) AS staff FROM phan_cong_ca pc JOIN don_vi_lam_viec dvlv ON dvlv.id=pc.don_vi_lam_viec_id JOIN vai_tro vt ON vt.id=pc.vai_tro_id JOIN ca_lam_viec clv ON clv.id=pc.ca_lam_viec_id JOIN nguoi_dung nd ON nd.id=pc.nguoi_dung_id WHERE pc.ngay_lam_viec BETWEEN DATE '2026-08-03' AND DATE '2026-08-09' GROUP BY dvlv.ma_don_vi,vt.ma_vai_tro,clv.ma_ca,pc.ngay_lam_viec ORDER BY dvlv.ma_don_vi,pc.ngay_lam_viec,clv.ma_ca`]
]) { console.log(`===${name}===`); console.log(JSON.stringify((await c.query(sql)).rows)); }
await c.end();
