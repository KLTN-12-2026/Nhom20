import { useEffect, useState } from 'react';

import { getApiErrorMessage } from '@/services/axios-client';

import { medicineApi } from '../api/medicine.api';
import type { Medicine } from '../types/medicine.type';

/** Danh mục thuốc chỉ-đọc dành cho màn kê đơn của bác sĩ. */
export function usePrescriptionMedicines(search: string) {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const keyword = search.trim();
    if (!keyword) {
      setMedicines([]);
      setError('');
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setIsLoading(true);
      setError('');
      void medicineApi
        .getAll({ search: keyword, status: 'DANG_HOAT_DONG', limit: 12 })
        .then((response) => {
          setMedicines(response.data);
        })
        .catch((requestError) => {
          setMedicines([]);
          setError(
            getApiErrorMessage(
              requestError,
              'Không thể tải danh sách thuốc trong kho',
            ),
          );
        })
        .finally(() => setIsLoading(false));
    }, 180);

    return () => window.clearTimeout(timer);
  }, [search]);

  return { medicines, isLoading, error };
}
