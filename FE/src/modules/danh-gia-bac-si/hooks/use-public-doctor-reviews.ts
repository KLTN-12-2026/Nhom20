import { useCallback, useEffect, useState } from 'react';

import { getApiErrorMessage } from '@/services/axios-client';

import {
  doctorReviewsApi,
  type PublicDoctorReview,
} from '../api/doctor-reviews.api';

export function usePublicDoctorReviews() {
  const [reviews, setReviews] = useState<PublicDoctorReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReviews = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await doctorReviewsApi.getPublic();
      setReviews(response.data);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Không thể tải đánh giá'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  return { reviews, isLoading, error, reload: loadReviews };
}
