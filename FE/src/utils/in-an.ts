// Mở mẫu in độc lập để trang Dashboard không bị in kèm sidebar và nút thao tác.
function maHoaNoiDung(value: string | number | null | undefined) {
  return String(value ?? '—')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

interface SunmiTextStyle {
  setAlign(value: unknown): SunmiTextStyle;
  setTextSize(value: number): SunmiTextStyle;
  setEnableBold(value: boolean): SunmiTextStyle;
}

interface SunmiH5Sdk {
  launchPrinterService(): Promise<unknown>;
  init(): void;
  socketManager?: { connected?: boolean };
  printer?: {
    lineApi?: {
      initLine(style: unknown): Promise<unknown>;
      printText(text: string, style: unknown): Promise<unknown>;
      autoOut(): Promise<unknown>;
    };
  };
  ENUM: { Align: { LEFT: unknown; CENTER: unknown } };
  class: {
    BaseStyle: { getStyle(): { setAlign(value: unknown): unknown } };
    TextStyle: { getStyle(): SunmiTextStyle };
  };
}

interface SunmiH5SdkConstructor {
  new(): SunmiH5Sdk;
}

declare global {
  interface Window {
    SUNMI?: SunmiH5SdkConstructor;
  }
}

export interface BillSunmi58mm {
  code: string;
  createdAt: string;
  patient: string;
  phone?: string;
  status: string;
  items: Array<{ name: string; quantity: number; unitPrice: number }>;
  total: number;
  paid: number;
  remaining: number;
  paymentMethod: string;
}

const SUNMI_H5_SDK_ID = 'sc-sunmi-h5-sdk';
const SUNMI_H5_SDK_URL = 'https://h5.sunmi.com/printer-sdk/dist/bundle.umd.js?a=78';
let sunmiSdk: SunmiH5Sdk | null = null;
let sunmiSdkLoading: Promise<SunmiH5SdkConstructor> | null = null;
let sunmiConnecting: Promise<SunmiH5Sdk> | null = null;

function isSunmiH5Target() {
  return import.meta.env.VITE_SUNMI_H5_ENABLED === 'true';
}

function loadSunmiH5Sdk(): Promise<SunmiH5SdkConstructor> {
  if (window.SUNMI) return Promise.resolve(window.SUNMI);
  if (sunmiSdkLoading) return sunmiSdkLoading;

  sunmiSdkLoading = new Promise((resolve, reject) => {
    const script = document.getElementById(SUNMI_H5_SDK_ID) as HTMLScriptElement | null;
    const onLoad = () => window.SUNMI
      ? resolve(window.SUNMI)
      : reject(new Error('Sunmi H5 SDK không khởi tạo được.'));
    const onError = () => reject(new Error('Không tải được Sunmi H5 SDK.'));

    if (script) {
      script.addEventListener('load', onLoad, { once: true });
      script.addEventListener('error', onError, { once: true });
      return;
    }

    const sdkScript = document.createElement('script');
    sdkScript.id = SUNMI_H5_SDK_ID;
    sdkScript.src = SUNMI_H5_SDK_URL;
    sdkScript.async = true;
    sdkScript.onload = onLoad;
    sdkScript.onerror = onError;
    document.head.appendChild(sdkScript);
  });

  return sunmiSdkLoading;
}

async function ketNoiMayInSunmiMoi() {
  if (sunmiSdk?.socketManager?.connected && sunmiSdk.printer?.lineApi) return sunmiSdk;

  const Sunmi = await loadSunmiH5Sdk();
  sunmiSdk = new Sunmi();
  await sunmiSdk.launchPrinterService();
  sunmiSdk.init();

  const deadline = Date.now() + 8_000;
  while (Date.now() < deadline) {
    if (sunmiSdk.socketManager?.connected && sunmiSdk.printer?.lineApi) return sunmiSdk;
    await new Promise((resolve) => window.setTimeout(resolve, 150));
  }

  throw new Error('Không kết nối được dịch vụ in Sunmi. Hãy mở Sunmi Printer Service và kiểm tra giấy in.');
}

async function ketNoiMayInSunmi() {
  if (sunmiSdk?.socketManager?.connected && sunmiSdk.printer?.lineApi) return sunmiSdk;
  if (sunmiConnecting) return sunmiConnecting;

  sunmiConnecting = ketNoiMayInSunmiMoi();
  try {
    return await sunmiConnecting;
  } finally {
    sunmiConnecting = null;
  }
}

function dinhDangTienSunmi(value: number) {
  return new Intl.NumberFormat('vi-VN').format(value);
}

function dongCanhPhaiSunmi(nhan: string, giaTri: string) {
  const width = 32;
  const spaces = Math.max(1, width - nhan.length - giaTri.length);
  return `${nhan}${' '.repeat(spaces)}${giaTri}\n`;
}

const RAWBT_PRINT_WIDTH = 30;

function tachDongRawBt(value: string) {
  const words = value.trim().split(/\s+/);
  const lines: string[] = [];
  let line = '';

  for (const word of words) {
    if (!line) {
      line = word;
    } else if (line.length + word.length + 1 <= RAWBT_PRINT_WIDTH) {
      line += ` ${word}`;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

function canGiuaRawBt(value: string) {
  return tachDongRawBt(value).map((line) => ` ${' '.repeat(Math.max(0, Math.floor((RAWBT_PRINT_WIDTH - line.length) / 2)))}${line}`);
}

function canTraiRawBt(value: string) {
  return tachDongRawBt(value).map((line) => ` ${line}`);
}

function dongCanhPhaiRawBt(nhan: string, giaTri: string) {
  if (nhan.length + giaTri.length + 1 > RAWBT_PRINT_WIDTH) {
    return [...canTraiRawBt(nhan), ` ${' '.repeat(Math.max(0, RAWBT_PRINT_WIDTH - giaTri.length))}${giaTri}`];
  }
  const spaces = RAWBT_PRINT_WIDTH - nhan.length - giaTri.length;
  return [` ${nhan}${' '.repeat(spaces)}${giaTri}`];
}

function taoNoiDungBillRawBt(bill: BillSunmi58mm) {
  const divider = ` ${'-'.repeat(RAWBT_PRINT_WIDTH)}`;
  const lines = [
    ...canGiuaRawBt('SMART CLINIC'),
    ...canGiuaRawBt('PHIẾU THANH TOÁN'),
    ...canGiuaRawBt(bill.createdAt),
    divider,
    ...canTraiRawBt(`Mã HĐ: ${bill.code}`),
    ...canTraiRawBt(`Bệnh nhân: ${bill.patient}`),
    ...(bill.phone ? canTraiRawBt(`SĐT: ${bill.phone}`) : []),
    ...canTraiRawBt(`Trạng thái: ${bill.status}`),
    divider,
    ...canGiuaRawBt('CHI TIẾT KHOẢN THU'),
    ...bill.items.flatMap((item, index) => [
      ...canTraiRawBt(`${index + 1}. ${item.name}`),
      ...dongCanhPhaiRawBt(`${item.quantity} x ${dinhDangTienSunmi(item.unitPrice)}`, dinhDangTienSunmi(item.quantity * item.unitPrice)),
    ]),
    divider,
    ...dongCanhPhaiRawBt('Tổng hóa đơn:', `${dinhDangTienSunmi(bill.total)} đ`),
    ...dongCanhPhaiRawBt('Đã thanh toán:', `${dinhDangTienSunmi(bill.paid)} đ`),
    ...(bill.remaining > 0 ? dongCanhPhaiRawBt('Còn phải thu:', `${dinhDangTienSunmi(bill.remaining)} đ`) : []),
    ...canTraiRawBt(`Phương thức: ${bill.paymentMethod}`),
    divider,
    ...canGiuaRawBt('Cảm ơn Quý khách!'),
    ...canGiuaRawBt('Chúc Quý khách mau bình phục!'),
    '', '', '',
  ];
  return lines.join('\n');
}

/** Gửi text thẳng tới RawBT từ Chrome Android, không đi qua Android print preview. */
export function inBillRawBT58mm(bill: BillSunmi58mm): boolean {
  if (!/Android/i.test(navigator.userAgent)) return false;
  window.location.href = `rawbt:${encodeURIComponent(taoNoiDungBillRawBt(bill))}`;
  return true;
}

/** In trực tiếp qua Sunmi H5 bridge; trả false trên thiết bị/trình duyệt không phải Sunmi. */
export async function inBillSunmi58mm(bill: BillSunmi58mm): Promise<boolean> {
  if (!isSunmiH5Target()) return false;

  const sdk = await ketNoiMayInSunmi();
  const lineApi = sdk.printer?.lineApi;
  if (!lineApi) throw new Error('Sunmi Printer Service chưa sẵn sàng.');

  const { Align } = sdk.ENUM;
  const { BaseStyle, TextStyle } = sdk.class;
  const center = () => TextStyle.getStyle().setAlign(Align.CENTER);
  const left = () => TextStyle.getStyle().setAlign(Align.LEFT);
  const boldCenter = () => center().setEnableBold(true);
  const boldLeft = () => left().setEnableBold(true);
  const divider = '--------------------------------\n';

  await lineApi.initLine(BaseStyle.getStyle().setAlign(Align.CENTER));
  await lineApi.printText('SMART CLINIC\n', boldCenter().setTextSize(30));
  await lineApi.printText('PHIẾU THANH TOÁN\n', boldCenter().setTextSize(26));
  await lineApi.printText(`${bill.createdAt}\n${divider}`, center());

  await lineApi.initLine(BaseStyle.getStyle().setAlign(Align.LEFT));
  await lineApi.printText(`Mã HĐ: ${bill.code}\n`, boldLeft());
  await lineApi.printText(`Bệnh nhân: ${bill.patient}\n`, left());
  if (bill.phone) await lineApi.printText(`SĐT: ${bill.phone}\n`, left());
  await lineApi.printText(`Trạng thái: ${bill.status}\n${divider}`, left());
  await lineApi.printText('CHI TIẾT KHOẢN THU\n', boldLeft());

  for (const [index, item] of bill.items.entries()) {
    await lineApi.printText(`${index + 1}. ${item.name}\n`, left());
    await lineApi.printText(
      dongCanhPhaiSunmi(`${item.quantity} x ${dinhDangTienSunmi(item.unitPrice)}`, dinhDangTienSunmi(item.quantity * item.unitPrice)),
      left(),
    );
  }

  await lineApi.printText(divider, left());
  await lineApi.printText(dongCanhPhaiSunmi('Tổng hóa đơn:', `${dinhDangTienSunmi(bill.total)} đ`), boldLeft());
  await lineApi.printText(dongCanhPhaiSunmi('Đã thanh toán:', `${dinhDangTienSunmi(bill.paid)} đ`), left());
  if (bill.remaining > 0) {
    await lineApi.printText(dongCanhPhaiSunmi('Còn phải thu:', `${dinhDangTienSunmi(bill.remaining)} đ`), boldLeft());
  }
  await lineApi.printText(`Phương thức: ${bill.paymentMethod}\n${divider}`, left());
  await lineApi.printText('Cảm ơn Quý khách!\nChúc Quý khách mau bình phục!\n\n\n', center());
  await lineApi.autoOut();

  return true;
}

/** Khởi động sẵn Sunmi Printer Service để lần bấm in đầu tiên không phải chờ kết nối. */
export async function khoiDongMayInSunmi(): Promise<boolean> {
  if (!isSunmiH5Target()) return false;
  await ketNoiMayInSunmi();
  return true;
}

export function dongIn(label: string, value: string | number | null | undefined) {
  return `<div class="dong"><span>${maHoaNoiDung(label)}</span><strong>${maHoaNoiDung(value)}</strong></div>`;
}

// Hàm chuẩn bị vùng in ẩn trên DOM thật
// SỬ DỤNG CSS DOM-SWAP CHUẨN: Không được lồng @page bên trong @media print vì sẽ làm crash CSS parser của máy POS Android!
function xetVungIn(html: string, pageCss: string, printCss: string) {
  let printContainer = document.getElementById('sc-print-container');
  if (!printContainer) {
    printContainer = document.createElement('div');
    printContainer.id = 'sc-print-container';
    document.body.appendChild(printContainer);
  }

  let style = document.getElementById('sc-print-global-style');
  if (!style) {
    style = document.createElement('style');
    style.id = 'sc-print-global-style';
    document.head.appendChild(style);
  }

  style.innerHTML = `
    /* 1. Ẩn bản in trên màn hình (Dùng opacity 0.01 và z-index âm để trình duyệt vẫn render layout, tránh lỗi trắng trang khi gọi lệnh in) */
    @media screen {
      #sc-print-container { 
        position: absolute !important;
        left: 0 !important;
        top: 0 !important;
        z-index: -9999 !important;
        opacity: 0.01 !important;
        pointer-events: none !important;
      }
    }

    /* 2. Khai báo khổ giấy (BẮT BUỘC nằm ngoài @media print để Android WebView không bị lỗi trắng trang) */
    ${pageCss}

    /* 3. Cấu hình in ấn */
    @media print {
      /* Reset trang để tránh bị cắt cụt 1cm */
      html, body {
        width: 100% !important;
        height: auto !important;
        min-height: auto !important;
        max-height: none !important;
        overflow: visible !important;
        margin: 0 !important;
        padding: 0 !important;
        background: #fff !important;
      }
      
      /* Ẩn giao diện chính của web (thường là thẻ div#root hoặc div chứa modal) */
      body > div:not(#sc-print-container) {
        display: none !important;
      }
      
      /* CHỈ hiển thị duy nhất bản in */
      body > #sc-print-container {
        display: block !important;
        visibility: visible !important;
        position: relative !important;
        width: 100% !important;
        height: auto !important;
        overflow: visible !important;
        margin: 0 !important;
        padding: 0 !important;
        background: #fff !important;
        color: #000 !important;
        opacity: 1 !important;
        z-index: 999999 !important;
      }

      body > #sc-print-container * {
        visibility: visible !important;
      }

      /* CSS định dạng nội dung phiếu */
      ${printCss}
    }
  `;

  printContainer.innerHTML = html;
}

export function moCuaSoIn(_tieuDe: string, noiDung: string) {
  const pageCss = `@page { size: A4; margin: 13mm; }`;
  const printCss = `
    * { box-sizing: border-box; }
    #sc-print-container { font: 13px/1.52 Arial, sans-serif; color: #172b4d; }
    .phieu { max-width: 184mm; margin: 0 auto; }
    .thuong-hieu { display:flex; align-items:flex-start; justify-content:space-between; gap:18px; border-bottom:2px solid #1769c2; padding:0 0 14px; margin-bottom:17px; }
    .thuong-hieu h1 { margin:0; color:#0e4f9a; font-size:23px; letter-spacing:.02em; }
    .thuong-hieu p { margin:4px 0 0; color:#61758d; }
    .thuong-hieu__right { color:#61758d; font-size:11px; text-align:right; }
    .tieu-de-phieu { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; margin:0 0 15px; }
    h2 { margin:0; color:#132f52; font-size:18px; letter-spacing:.01em; }
    .ma-phieu { padding:5px 9px; border:1px solid #bad8f6; border-radius:7px; background:#edf6ff; color:#115aa9; font-size:11px; font-weight:700; white-space:nowrap; }
    .meta { color:#61758d; margin:4px 0 0; }
    .thong-tin-in { display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:8px 18px; margin:0 0 14px; padding:12px 14px; border:1px solid #dbe6f2; border-radius:10px; background:#fbfdff; }
    .thong-tin-in span { display:block; color:#64758a; font-size:11px; }
    .thong-tin-in strong { display:block; margin-top:2px; color:#173052; }
    .dong { display:flex; justify-content:space-between; gap:24px; border-bottom:1px solid #e2e8f0; padding:8px 0; }
    .dong span { color:#475569; }
    table { width:100%; border-collapse:collapse; margin-top:10px; }
    th { background:#eaf4ff; color:#164777; font-size:11px; text-align:left; text-transform:uppercase; }
    th, td { padding:9px 10px; border:1px solid #cbd9e8; vertical-align:top; }
    td small { display:block; margin-top:2px; color:#6c7d91; }
    .so { text-align:right; }
    .tong { display:grid; grid-template-columns:1fr auto; gap:6px 28px; margin:16px 0 0 auto; max-width:330px; padding:12px 14px; border:1px solid #cddfeb; border-radius:10px; background:#f7fbff; }
    .tong strong:nth-child(2n) { text-align:right; }
    .tong .con-lai { color:#bc3540; }
    .ghi-chu { margin-top:16px; padding:11px 12px; border-left:3px solid #1769c2; background:#f4f9ff; color:#4f647b; }
    .chu-ky { display:grid; grid-template-columns:repeat(3, minmax(0,1fr)); gap:18px; margin-top:42px; text-align:center; }
    .chu-ky__item { min-height:105px; display:flex; flex-direction:column; align-items:center; }
    .chu-ky__item strong { color:#1c3556; }
    .chu-ky__item small { margin-top:3px; color:#66778c; }
    .chu-ky__space { flex:1; min-height:48px; }
    .chu-ky__name { min-width:126px; padding-top:5px; border-top:1px solid #9eb2c7; color:#2a4565; font-weight:700; }
    .footer-in { margin-top:22px; padding-top:9px; border-top:1px solid #d9e3ee; color:#718095; font-size:10px; text-align:center; }
    .khong-in { display:none !important; }
  `;

  xetVungIn(`<main class="phieu">${noiDung}</main>`, pageCss, printCss);

  // Đợi một chút để browser render bản in xong thì gọi lệnh in
  setTimeout(() => {
    window.print();
  }, 400);

  return true;
}

export function moCuaSoInBill58mm(_tieuDe: string, noiDung: string) {
  // Thay vì size: 58mm auto (có thể gây lỗi trên một số bản Chrome cũ), ta dùng portrait
  const pageCss = `@page { size: portrait; margin: 0; }`;
  const printCss = `
    * { box-sizing: border-box; }
    #sc-print-container {
      font-family: 'Courier New', Courier, monospace, 'Segoe UI', Arial, sans-serif;
      font-size: 11px;
      line-height: 1.35;
      color: #000;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .bill-58 {
      width: 52mm;
      margin: 0 auto;
      padding: 2mm 1mm 12mm 1mm;
    }
    .bill-center { text-align: center; }
    .bill-right { text-align: right; }
    .bill-bold { font-weight: 700; }
    .bill-header { text-align: center; margin-bottom: 5px; }
    .bill-header h1 { font-size: 13.5px; font-weight: 800; margin: 0 0 2px; text-transform: uppercase; }
    .bill-header p { font-size: 9.5px; margin: 1px 0; }
    .bill-divider { border: none; border-top: 1px dashed #000; margin: 5px 0; }
    .bill-title { font-size: 12.5px; font-weight: 800; margin: 3px 0; text-align: center; text-transform: uppercase; }
    .bill-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 4px; margin-bottom: 2.5px; font-size: 10.5px; }
    .bill-row span { color: #000; }
    .bill-item { margin-bottom: 4px; }
    .bill-item__name { font-weight: 600; font-size: 10.5px; word-break: break-word; }
    .bill-item__detail { display: flex; justify-content: space-between; font-size: 10px; padding-left: 4px; margin-top: 1px; }
    .bill-totals { margin-top: 4px; padding-top: 4px; border-top: 1px dashed #000; }
    .bill-grand { font-size: 12.5px; font-weight: 800; }
    .bill-footer { margin-top: 8px; padding-top: 5px; border-top: 1px dashed #000; text-align: center; font-size: 9.5px; line-height: 1.3; }
    .khong-in { display: none !important; }
  `;

  xetVungIn(`<main class="bill-58">${noiDung}</main>`, pageCss, printCss);

  // Đợi một chút để browser render bản in xong thì gọi lệnh in
  setTimeout(() => {
    window.print();
  }, 400);

  return true;
}

export { maHoaNoiDung };
