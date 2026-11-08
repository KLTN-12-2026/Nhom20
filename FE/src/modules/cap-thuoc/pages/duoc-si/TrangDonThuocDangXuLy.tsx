import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAppToast } from '@/components/ui/use-app-toast';
import { getApiErrorMessage } from '@/services/axios-client';
import { dinhDangNgayGio } from '@/utils/dinh-dang-ngay';

import { dispensingApi } from '../../api/dispensing.api';
import type { DispensingPrescription } from '../../types/dispensing.types';
import '@/components/ui/admin-crud.css';
import '../../pharmacist-workspace.css';

const PRESCRIPTIONS_PER_PAGE = 10;

function getPageNumbers(currentPage: number, totalPages: number) {
  return [...new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1])]
    .filter((p) => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b);
}

export default function TrangDonThuocDangXuLy() {
  const navigate = useNavigate();
  const { showToast } = useAppToast();
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<DispensingPrescription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  const loadProcessing = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await dispensingApi.getProcessing();
      setItems(response.data.data.items);
    } catch (requestError) {
      const message = getApiErrorMessage(requestError, 'Không thể tải đơn thuốc đang xử lý');
      setError(message);
      showToast(message, 'danger');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => { void loadProcessing(); }, [loadProcessing]);

  const rows = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('vi');
    if (!keyword) return items;
    return items.filter((item) => `${item.code} ${item.patient.fullName} ${item.doctor.fullName}`.toLocaleLowerCase('vi').includes(keyword));
  }, [items, search]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PRESCRIPTIONS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pageNumbers = useMemo(
    () => getPageNumbers(currentPage, totalPages),
    [currentPage, totalPages],
  );
  const displayedFrom =
    rows.length === 0 ? 0 : (currentPage - 1) * PRESCRIPTIONS_PER_PAGE + 1;
  const displayedTo = Math.min(currentPage * PRESCRIPTIONS_PER_PAGE, rows.length);
  const paginatedRows = useMemo(
    () =>
      rows.slice(
        (currentPage - 1) * PRESCRIPTIONS_PER_PAGE,
        currentPage * PRESCRIPTIONS_PER_PAGE,
      ),
    [currentPage, rows],
  );

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  return (
    <div className="pharmacy-page admin-crud-page">
      <header className="admin-crud-heading">
        <div>
          <p className="admin-management-eyebrow">Quy trình cấp phát thuốc</p>
          <h1>ĐƠN THUỐC ĐANG XỬ LÝ</h1>
          <p className="admin-management-description">
            Lưu các đơn thuốc đã tiếp nhận để tiếp tục xử lý và hoàn tất cấp phát.
          </p>
        </div>
      </header>
      <section className="pharmacy-panel">
        <div className="pharmacy-filter">
          <div className="input-group">
            <span className="input-group-text">
              <span className="material-symbols-outlined">search</span>
            </span>
            <input
              className="form-control"
              placeholder="Tìm mã đơn, bệnh nhân hoặc bác sĩ..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>
        {isLoading ? (
          <div className="p-5 text-center">Đang tải đơn thuốc...</div>
        ) : error ? (
          <div className="p-5 text-center">
            <p className="text-danger mb-3">{error}</p>
            <button
              className="btn btn-outline-primary"
              type="button"
              onClick={() => void loadProcessing()}
            >
              Thử lại
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="p-5 text-center text-secondary">
            <span className="material-symbols-outlined fs-1 d-block mb-2">
              inventory
            </span>
            {search ? 'Không tìm thấy đơn thuốc phù hợp.' : 'Không có đơn thuốc nào đang xử lý.'}
          </div>
        ) : (
          <>
            <div className="table-responsive">
              <table
                className="table pharmacy-table align-middle mb-0"
                style={{ tableLayout: 'fixed', minWidth: '950px', width: '100%' }}
              >
                <colgroup>
                  <col style={{ width: '15%', minWidth: '130px' }} />
                  <col style={{ width: '23%', minWidth: '180px' }} />
                  <col style={{ width: '25%', minWidth: '180px' }} />
                  <col style={{ width: '10%', minWidth: '90px' }} />
                  <col style={{ width: '13%', minWidth: '130px' }} />
                  <col style={{ width: '14%', minWidth: '140px' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th style={{ width: '15%', minWidth: '130px' }}>Mã đơn</th>
                    <th style={{ width: '23%', minWidth: '180px' }}>Bệnh nhân</th>
                    <th style={{ width: '25%', minWidth: '180px' }}>Bác sĩ / Chuyên khoa</th>
                    <th style={{ width: '10%', minWidth: '90px' }}>Số thuốc</th>
                    <th style={{ width: '13%', minWidth: '130px' }}>Tiếp nhận lúc</th>
                    <th className="text-end" style={{ width: '14%', minWidth: '140px' }}>
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRows.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong className="text-primary">{item.code}</strong>
                      </td>
                      <td>
                        <div className="pharmacy-person">
                          <div>
                            <strong>{item.patient.fullName}</strong>
                            <small>{item.patient.code}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="pharmacy-person">
                          <div>
                            <strong>{item.doctor.fullName}</strong>
                            <small>{item.doctor.specialty}</small>
                          </div>
                        </div>
                      </td>
                      <td>{item.items.length}</td>
                      <td>{dinhDangNgayGio(item.createdAt)}</td>
                      <td className="text-end">
                        <button
                          className="btn btn-sm btn-primary text-nowrap"
                          style={{ minHeight: '32px', height: '32px', padding: '0 12px', fontSize: '0.8125rem' }}
                          type="button"
                          onClick={() => navigate(`/duoc-si/dang-xu-ly/${item.id}`)}
                        >
                          Tiếp tục cấp thuốc
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.length > 0 && (
              <footer className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 px-3 py-2 border-top">
                <span className="text-secondary small">
                  Hiển thị {displayedFrom}–{displayedTo} trong tổng số {rows.length} đơn thuốc
                </span>
                <nav aria-label="Phân trang đơn đang xử lý">
                  <ul className="pagination mb-0 flex-wrap">
                    <li className={`page-item ${currentPage <= 1 ? 'disabled' : ''}`}>
                      <button
                        type="button"
                        className="page-link"
                        aria-label="Trang trước"
                        disabled={currentPage <= 1}
                        onClick={() => setPage((current) => Math.max(1, current - 1))}
                      >
                        <span aria-hidden="true">&laquo;</span>
                      </button>
                    </li>
                    {pageNumbers.map((pageNumber, index) => (
                      <Fragment key={pageNumber}>
                        {index > 0 && pageNumber - pageNumbers[index - 1] > 1 && (
                          <li className="page-item disabled" aria-hidden="true">
                            <span className="page-link">…</span>
                          </li>
                        )}
                        <li className={`page-item ${pageNumber === currentPage ? 'active' : ''}`}>
                          <button
                            type="button"
                            className="page-link"
                            aria-current={pageNumber === currentPage ? 'page' : undefined}
                            onClick={() => setPage(pageNumber)}
                          >
                            {pageNumber}
                          </button>
                        </li>
                      </Fragment>
                    ))}
                    <li className={`page-item ${currentPage >= totalPages ? 'disabled' : ''}`}>
                      <button
                        type="button"
                        className="page-link"
                        aria-label="Trang sau"
                        disabled={currentPage >= totalPages}
                        onClick={() =>
                          setPage((current) => Math.min(totalPages, current + 1))
                        }
                      >
                        <span aria-hidden="true">&raquo;</span>
                      </button>
                    </li>
                  </ul>
                </nav>
              </footer>
            )}
          </>
        )}
      </section>
    </div>
  );
}
