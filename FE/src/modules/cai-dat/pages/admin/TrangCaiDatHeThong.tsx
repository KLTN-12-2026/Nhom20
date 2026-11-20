import { useState } from 'react';
import { Settings, Eye, EyeOff } from 'lucide-react';
import { useAppToast } from '@/components/ui/use-app-toast';
import '@/components/ui/admin-crud.css';

export default function TrangCaiDatHeThong() {
  const { showToast } = useAppToast();
  const [showSepayToken, setShowSepayToken] = useState(false);

  const handleSave = () => {
    showToast('Đã lưu cấu hình hệ thống thành công', 'success');
  };

  return (
    <div className="admin-crud-page">
      <div className="admin-crud-heading">
        <div>
          <p className="admin-management-eyebrow">Hệ thống</p>
          <h1>CÀI ĐẶT HỆ THỐNG</h1>
          <p className="admin-management-description">Quản lý thông tin phòng khám và cấu hình tích hợp.</p>
        </div>
        <button className="btn btn-primary d-flex align-items-center gap-2" onClick={handleSave}>
          <Settings size={18} />
          Lưu thay đổi
        </button>
      </div>

      <div className="card border-0 shadow-sm rounded-4">
        <div className="card-body p-4 p-lg-5">
          <h4 className="fw-bold mb-4 text-dark">Thông tin phòng khám</h4>
          <form className="row g-4" onSubmit={(e) => e.preventDefault()}>
            <div className="col-md-6">
              <label className="form-label fw-semibold text-muted small">Tên phòng khám</label>
              <input type="text" className="form-control bg-light border-0 py-2" defaultValue="Smart Clinic AI Center" />
            </div>
            <div className="col-md-6">
              <label className="form-label fw-semibold text-muted small">Mã số thuế</label>
              <input type="text" className="form-control bg-light border-0 py-2" defaultValue="0101234567" />
            </div>
            <div className="col-12">
              <label className="form-label fw-semibold text-muted small">Địa chỉ</label>
              <input type="text" className="form-control bg-light border-0 py-2" defaultValue="123 Đường Công Nghệ, Quận Smart, TP.Đà Nẵng" />
            </div>
            <div className="col-md-6">
              <label className="form-label fw-semibold text-muted small">Số điện thoại liên hệ</label>
              <input type="tel" className="form-control bg-light border-0 py-2" defaultValue="1900 1234" />
            </div>
            <div className="col-md-6">
              <label className="form-label fw-semibold text-muted small">Email</label>
              <input type="email" className="form-control bg-light border-0 py-2" defaultValue="contact@smartclinic.ai" />
            </div>

            <div className="col-12 mt-5">
              <h5 className="fw-bold mb-3 border-top pt-4 text-dark">Cấu hình Cổng thanh toán SePay</h5>
              <div className="row">
                <div className="col-md-6">
                  <label className="form-label fw-semibold text-muted small">SePay API Token</label>
                  <div className="input-group">
                    <input 
                      type={showSepayToken ? "text" : "password"} 
                      className="form-control bg-light border-0 py-2" 
                      defaultValue="PABB4IO187RVOCDWOHCNXFPE32EJQZ3GLTANG9LXU4QLY1BR5G0DWKKETKCZ0YAN" 
                    />
                    <button 
                      className="btn btn-light bg-light border-0 text-muted px-3" 
                      type="button"
                      onClick={() => setShowSepayToken(!showSepayToken)}
                    >
                      {showSepayToken ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 mt-5">
              <h5 className="fw-bold mb-3 border-top pt-4 text-dark">Cấu hình Gửi Thông báo (SMS/Email)</h5>
              
              <div className="d-flex align-items-center justify-content-between p-4 border border-light rounded-4 bg-light">
                <div>
                  <div className="fw-bold text-dark mb-1">Tự động gửi email nhắc lịch hẹn</div>
                  <div className="text-muted small fw-medium">Gửi trước 24 giờ cho bệnh nhân</div>
                </div>
                <div className="form-check form-switch fs-4 mb-0">
                  <input className="form-check-input cursor-pointer" type="checkbox" role="switch" defaultChecked />
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
      
      <style>{`
        .cursor-pointer { cursor: pointer; }
      `}</style>
    </div>
  );
}
