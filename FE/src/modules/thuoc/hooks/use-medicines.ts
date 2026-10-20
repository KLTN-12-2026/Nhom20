import { useCallback, useEffect, useState } from 'react';

import { useAppToast } from '@/components/ui/use-app-toast';
import { getApiErrorMessage } from '@/services/axios-client';

import { medicineApi } from '../api/medicine.api';
import type {
  CreateMedicineDto,
  Medicine,
  MedicineListMeta,
  MedicineQuery,
  StockInDto,
  UpdateMedicineDto,
} from '../types/medicine.type';

const DEFAULT_META: MedicineListMeta = {
  total: 0,
  page: 1,
  limit: 20,
  totalPages: 1,
  stats: {
    total: 0,
    lowStock: 0,
    inventoryValue: 0,
    activeIngredients: 0,
    expiringSoon: 0,
    expired: 0,
  },
  groups: [],
};

export function useMedicines(filters: MedicineQuery = {}) {
  const { showToast } = useAppToast();
  const {
    page,
    limit,
    search,
    group,
    status,
    tab,
  } = filters;
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [medicineOptions, setMedicineOptions] = useState<Medicine[]>([]);
  const [meta, setMeta] = useState<MedicineListMeta>(DEFAULT_META);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isStockingIn, setIsStockingIn] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const fetchMedicines = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');
      const response = await medicineApi.getAll({
        page,
        limit,
        search,
        group,
        status,
        tab,
      });
      setMedicines(response.data);
      setMeta(response.meta);
    } catch (requestError) {
      const message = getApiErrorMessage(
        requestError,
        'Không thể tải danh sách thuốc',
      );
      setError(message);
      showToast(message, 'danger');
    } finally {
      setIsLoading(false);
    }
  }, [
    group,
    limit,
    page,
    search,
    showToast,
    status,
    tab,
  ]);

  useEffect(() => {
    void fetchMedicines();
  }, [fetchMedicines]);

  const fetchMedicineOptions = useCallback(async () => {
    try {
      const response = await medicineApi.getAll({ limit: 100 });
      setMedicineOptions(
        response.data.filter(
          (medicine) => medicine.trangThai === 'DANG_HOAT_DONG',
        ),
      );
    } catch (requestError) {
      showToast(
        getApiErrorMessage(
          requestError,
          'Không thể tải danh mục thuốc để nhập kho',
        ),
        'danger',
      );
    }
  }, [showToast]);

  useEffect(() => {
    void fetchMedicineOptions();
  }, [fetchMedicineOptions]);

  const create = async (data: CreateMedicineDto) => {
    try {
      setIsCreating(true);
      const response = await medicineApi.create(data);
      showToast(response.message);
      await Promise.all([fetchMedicines(), fetchMedicineOptions()]);
      return response.data;
    } catch (requestError) {
      showToast(
        getApiErrorMessage(requestError, 'Không thể thêm thuốc'),
        'danger',
      );
      return null;
    } finally {
      setIsCreating(false);
    }
  };

  const update = async (id: number, data: UpdateMedicineDto) => {
    try {
      setIsUpdating(true);
      const response = await medicineApi.update(id, data);
      showToast(response.message);
      await Promise.all([fetchMedicines(), fetchMedicineOptions()]);
      return response.data;
    } catch (requestError) {
      showToast(
        getApiErrorMessage(requestError, 'Không thể cập nhật thuốc'),
        'danger',
      );
      return null;
    } finally {
      setIsUpdating(false);
    }
  };

  const remove = async (id: number) => {
    try {
      setIsRemoving(true);
      const response = await medicineApi.remove(id);
      showToast(response.message);
      await Promise.all([fetchMedicines(), fetchMedicineOptions()]);
      return true;
    } catch (requestError) {
      showToast(
        getApiErrorMessage(requestError, 'Không thể xóa thuốc'),
        'danger',
      );
      return false;
    } finally {
      setIsRemoving(false);
    }
  };

  const stockIn = async (id: number, data: StockInDto) => {
    try {
      setIsStockingIn(true);
      const response = await medicineApi.stockIn(id, data);
      showToast(response.message);
      await fetchMedicines();
      return true;
    } catch (requestError) {
      showToast(
        getApiErrorMessage(requestError, 'Không thể nhập kho thuốc'),
        'danger',
      );
      return false;
    } finally {
      setIsStockingIn(false);
    }
  };

  const uploadImage = async (id: number, file: File) => {
    try {
      setIsUploadingImage(true);
      const response = await medicineApi.uploadImage(id, file);
      showToast(response.message);
      await fetchMedicines();
      return true;
    } catch (requestError) {
      showToast(
        getApiErrorMessage(requestError, 'Không thể tải ảnh thuốc'),
        'danger',
      );
      return false;
    } finally {
      setIsUploadingImage(false);
    }
  };

  const removeImage = async (id: number) => {
    try {
      setIsUploadingImage(true);
      const response = await medicineApi.removeImage(id);
      showToast(response.message);
      await fetchMedicines();
      return true;
    } catch (requestError) {
      showToast(
        getApiErrorMessage(requestError, 'Không thể xóa ảnh thuốc'),
        'danger',
      );
      return false;
    } finally {
      setIsUploadingImage(false);
    }
  };

  return {
    medicines,
    medicineOptions,
    meta,
    error,
    isLoading,
    create,
    isCreating,
    update,
    isUpdating,
    remove,
    isRemoving,
    stockIn,
    isStockingIn,
    uploadImage,
    removeImage,
    isUploadingImage,
    refresh: fetchMedicines,
  };
}
