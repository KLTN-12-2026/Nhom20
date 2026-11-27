import { useState } from 'react';
import ServiceCards from '../components/ServiceCards';
import '../components/services.css';
import '@/modules/trang-chu/public-pages.css';

export default function TrangDichVu() {
  const [search, setSearch] = useState('');
  const [serviceCount, setServiceCount] = useState(0);

  return (
    <div className="public-directory-page">
      <section className="public-directory-hero">
        <div className="container public-directory-hero__content">
          <span className="public-directory-hero__eyebrow">
            Dịch vụ đang cung cấp
          </span>
          <h1>Dịch vụ khám rõ ràng, chi phí minh bạch</h1>
          <p>
            Danh sách chỉ gồm những dịch vụ phòng khám hiện có chuyên khoa và bác sĩ tiếp nhận.
          </p>
        </div>
      </section>

      <div className="container public-directory-content">
        <div className="public-directory-toolbar">
          <div className="public-directory-search">
            <span className="material-symbols-outlined">search</span>
            <input
              className="form-control"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm dịch vụ..."
            />
          </div>
          <span className="text-secondary small px-2">
            {serviceCount} dịch vụ đang cung cấp
          </span>
        </div>

        <ServiceCards
          pageSize={8}
          search={search}
          onCountChange={setServiceCount}
        />
      </div>
    </div>
  );
}
