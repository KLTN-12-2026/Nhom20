import { useState } from 'react';
import { Settings, Building2, Clock, CreditCard, Bell, Database, Eye, EyeOff } from 'lucide-react';
import { useAppToast } from '@/components/ui/use-app-toast';

export default function TrangCaiDatHeThong() {
  const { showToast } = useAppToast();
  const [activeTab, setActiveTab] = useState('thong-tin');
  const [showVnpayId, setShowVnpayId] = useState(false);

  const tabs = [
    { id: 'thong-tin', label: 'Thông tin phòng khám', icon: Building2 },
    { id: 'gio-lam-viec', label: 'Giờ làm việc', icon: Clock },
    { id: 'thanh-toan', label: 'Thanh toán', icon: CreditCard },
    { id: 'thong-bao', label: 'Thông báo', icon: Bell },
    { id: 'he-thong', label: 'Hệ thống', icon: Database },
  ];

  const handleSave = () => {
    showToast('Đã lưu cấu hình hệ thống thành công', 'success');
  };

  return (
    <div className="container-fluid py-4 px-4">
      <div className="d-flex justify-content-between align-items-start mb-4">
        <div>
          <div className="text-primary fw-semibold small text-uppercase mb-1">Hệ thống</div>
          <h1 className="h3 fw-bold mb-1">Cài đặt hệ thống</h1>
          <p className="text-muted mb-0">Quản lý thông tin phòng khám và cấu hình tích hợp.</p>
        </div>
        <button className="btn btn-primary d-flex align-items-center gap-2" onClick={handleSave}>
          <Settings size={18} />
          Lưu thay đổi
        </button>
      </div>

      <div className="row g-4">
        {/* Settings Navigation */}
        <div className="col-12 col-md-3">
          <div className="card border-0 shadow-sm rounded-4">
            <div className="card-body p-3">
              <div className="d-flex flex-column gap-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`btn text-start d-flex align-items-center gap-3 px-3 py-3 border-0 ${
                      activeTab === tab.id
                        ? 'btn-primary text-white shadow-sm fw-semibold'
                        : 'btn-light text-body bg-transparent hover-bg-light fw-medium'
                    }`}
                    style={{ borderRadius: '10px', transition: 'all 0.2s' }}
                  >
                    <tab.icon size={20} />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Settings Content */}
        <div className="col-12 col-md-9">
          <div className="card border-0 shadow-sm rounded-4 h-100">
            <div className="card-body p-4 p-lg-5">
              
              {activeTab === 'thong-tin' && (
                <div>
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
                      <input type="text" className="form-control bg-light border-0 py-2" defaultValue="123 Đường Công Nghệ, Quận Smart, TP.HCM" />
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
                      <h5 className="fw-bold mb-3 border-top pt-4 text-dark">Cấu hình API Thanh toán (Mặc định)</h5>
                      <div className="row">
                        <div className="col-md-6">
                          <label className="form-label fw-semibold text-muted small">VNPay Merchant ID</label>
                          <div className="input-group">
                            <input 
                              type={showVnpayId ? "text" : "password"} 
                              className="form-control bg-light border-0 py-2" 
                              defaultValue="VNPAY_123456" 
                            />
                            <button 
                              className="btn btn-light bg-light border-0 text-muted px-3" 
                              type="button"
                              onClick={() => setShowVnpayId(!showVnpayId)}
                            >
                              {showVnpayId ? <EyeOff size={20} /> : <Eye size={20} />}
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
              )}

              {activeTab !== 'thong-tin' && (
                <div className="text-center py-5 text-muted mt-5">
                  <Settings size={64} className="opacity-25 mb-4 mx-auto text-primary" />
                  <h5 className="fw-semibold">Đang phát triển</h5>
                  <p>Tính năng cấu hình "{tabs.find(t => t.id === activeTab)?.label}" sẽ được cập nhật sớm.</p>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
      
      {/* Thêm CSS inline cho hover effect của tab */}
      <style>{`
        .hover-bg-light:hover { background-color: #f8f9fa !important; }
        .cursor-pointer { cursor: pointer; }
      `}</style>
    </div>
  );
}
