import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAppToast } from '@/components/ui/use-app-toast';
import { useRealtimeEvent } from '@/hooks/use-realtime-event';
import { getApiErrorMessage } from '@/services/axios-client';
import { dinhDangNgayGio } from '@/utils/dinh-dang-ngay';
import { useAuthStore } from '@/stores/auth.store';
import { hasPermission } from '@/utils/permissions';

import { dispensingApi } from '../../api/dispensing.api';
import { medicinesApi, type MedicineBatchRow } from '../../api/medicines.api';
import type { DispensingPrescription } from '../../types/dispensing.types';
import '@/components/ui/admin-crud.css';
import '@/modules/thuoc/medicine-inventory.css';
import '../../pharmacist-workspace.css';

const PRESCRIPTIONS_PER_PAGE = 5;

function getPageNumbers(currentPage: number, totalPages: number) {
  return [...new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1])]
    .filter((p) => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b);
}

export default function TrangTongQuanDuocSi() {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const { showToast } = useAppToast();
  const [pending, setPending] = useState<DispensingPrescription[]>([]);
  const [batches, setBatches] = useState<MedicineBatchRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);

  const totalPages = Math.max(
    1,
    Math.ceil(pending.length / PRESCRIPTIONS_PER_PAGE),
  );
  const currentPage = Math.min(page, totalPages);
  const pageNumbers = useMemo(
    () => getPageNumbers(currentPage, totalPages),
    [currentPage, totalPages],
  );
  const displayedFrom =
    pending.length === 0 ? 0 : (currentPage - 1) * PRESCRIPTIONS_PER_PAGE + 1;
  const displayedTo = Math.min(
    currentPage * PRESCRIPTIONS_PER_PAGE,
    pending.length,
  );
  const paginatedPending = useMemo(
    () =>
      pending.slice(
        (currentPage - 1) * PRESCRIPTIONS_PER_PAGE,
        currentPage * PRESCRIPTIONS_PER_PAGE,
      ),
    [currentPage, pending],
  );

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const load = useCallback(async () => {
    try {
      const [prescriptions, medicineBatches] = await Promise.all([
        dispensingApi.getPending(),
        medicinesApi.batches(),
      ]);
      setPending(prescriptions.data.data.items);
      setBatches(medicineBatches.data.data);
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);
  useRealtimeEvent('prescription.created', load);

  const accept = async (id: number) => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await dispensingApi.accept(id);
      navigate(`/duoc-si/dang-xu-ly/${id}`);
    } catch (error) {
      showToast(
        getApiErrorMessage(error, 'Không thể tiếp nhận đơn thuốc'),
        'danger',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const expiringBatchesCount = batches.filter(
    (batch) => batch.status === 'SẮP HẾT HẠN',
  ).length;
  const outOfStockCount = batches.filter(
    (batch) => batch.status === 'HẾT HÀNG',
  ).length;

  return (
    <div className="medicine-inventory admin-crud-page">
      <header className="admin-crud-heading">
        <div>
          <p className="admin-management-eyebrow">HỆ THỐNG QUẢN LÝ DƯỢC</p>
          <h1>TỔNG QUAN NHÀ THUỐC</h1>
          <p className="admin-management-description">
            Theo dõi đơn thuốc chờ cấp, lô thuốc sắp hết hạn và tình trạng thuốc hết hàng.
          </p>
        </div>
      </header>

      <section className="medicine-inventory__stats">
        <article>
          <span className="material-symbols-outlined">pending_actions</span>
          <div>
            <small>Đơn chờ cấp</small>
            <strong>{pending.length}</strong>
          </div>
        </article>
        <article className="is-warning">
          <span className="material-symbols-outlined">event_busy</span>
          <div>
            <small>Lô sắp hết hạn</small>
            <strong>{expiringBatchesCount}</strong>
          </div>
        </article>
        <article>
          <span className="material-symbols-outlined">
            production_quantity_limits
          </span>
          <div>
            <small>Thuốc hết hàng</small>
            <strong>{outOfStockCount}</strong>
          </div>
        </article>
      </section>

      <section className="medicine-inventory__card">
        <div className="medicine-inventory__tabs justify-content-between">
          <div className="fw-bold fs-6 text-dark d-flex align-items-center gap-2">
            <span className="material-symbols-outlined text-primary">
              receipt_long
            </span>
            <span>Đơn thuốc mới nhất (chờ dược sĩ tiếp nhận)</span>
          </div>
          <Link
            className="btn btn-sm btn-primary d-inline-flex align-items-center gap-1 text-white"
            to="/duoc-si/don-cho-cap"
          >
            <span>Xem tất cả</span>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              arrow_forward
            </span>
          </Link>
        </div>

        <div className="table-responsive">
          <table
            className="table medicine-inventory__table align-middle mb-0"
            style={{ tableLayout: 'fixed', minWidth: '900px', width: '100%' }}
          >
            <colgroup>
              <col style={{ width: '15%', minWidth: '130px' }} />
              <col style={{ width: '28%', minWidth: '200px' }} />
              <col style={{ width: '25%', minWidth: '180px' }} />
              <col style={{ width: '18%', minWidth: '150px' }} />
              <col style={{ width: '14%', minWidth: '130px' }} />
            </colgroup>
            <thead>
              <tr>
                <th style={{ width: '15%', minWidth: '130px' }}>Mã đơn</th>
                <th style={{ width: '28%', minWidth: '200px' }}>Bệnh nhân</th>
                <th style={{ width: '25%', minWidth: '180px' }}>Bác sĩ</th>
                <th style={{ width: '18%', minWidth: '150px' }}>Thời gian</th>
                <th className="text-end" style={{ width: '14%', minWidth: '130px' }}>
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody>
              {pending.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-secondary">
                    Hiện chưa có đơn thuốc nào đang chờ tiếp nhận.
                  </td>
                </tr>
              ) : (
                paginatedPending.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <span className="medicine-inventory__code">
                        {item.code}
                      </span>
                    </td>
                    <td>
                      <div>
                        <strong className="text-dark">{item.patient.fullName}</strong>
                        <small className="d-block text-secondary">
                          Mã BN: {item.patient.code}
                        </small>
                      </div>
                    </td>
                    <td>
                      <div>
                        <strong className="text-dark">{item.doctor.fullName}</strong>
                        <small className="d-block text-secondary">
                          Khoa: {item.doctor.specialty}
                        </small>
                      </div>
                    </td>
                    <td>
                      <span className="text-nowrap text-secondary">
                        {dinhDangNgayGio(item.createdAt)}
                      </span>
                    </td>
                    <td className="text-end">
                      <div className="admin-crud-actions justify-content-end">
                        {hasPermission(user, 'CAP_THUOC.UPDATE') && <button
                          className="btn btn-sm btn-primary text-nowrap"
                          disabled={isLoading}
                          onClick={() => void accept(item.id)}
                        >
                          <span className="material-symbols-outlined">
                            check_circle
                          </span>
                          Tiếp nhận
                        </button>}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {pending.length > 0 && (
          <footer className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 px-3 py-2 border-top">
            <span className="text-secondary small">
              Hiển thị {displayedFrom}–{displayedTo} trong tổng số {pending.length} đơn thuốc
            </span>
            <nav aria-label="Phân trang đơn thuốc chờ tiếp nhận">
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
      </section>
    </div>
  );
}
