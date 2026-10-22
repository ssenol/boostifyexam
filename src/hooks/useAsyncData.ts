import { useCallback, useEffect, useRef, useState } from 'react';
import { getErrorMessage } from '../utils/errors';

interface AsyncData<T> {
  data: T | null;
  loading: boolean;
  // İlk yüklemeden sonraki yenilemeler (pull-to-refresh)
  refreshing: boolean;
  error: string | null;
  reload: () => Promise<void>;
  // Yükleniyor göstergesi olmadan yeniler (ör. ekrana geri dönülünce). iOS'ta RefreshControl'ü programla açıp
  // kapatmak, ekran geçişi sırasında listeyi aşağıda bırakıyordu (boşluk / donmuş simge).
  reloadQuietly: () => Promise<void>;
}

// Servis çağrısını yükleme/hata durumuyla sarar. `load` her render'da değişmesin diye useCallback ile verilmeli.
export default function useAsyncData<T>(load: () => Promise<T>): AsyncData<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  const hasData = useRef(false);

  // State yalnızca await'ten sonra değişir; ilk yüklemede effect'ten güvenle çağrılabilir
  const fetchData = useCallback(async () => {
    try {
      const result = await load();
      if (!mounted.current) return;
      hasData.current = true;
      setData(result);
      setError(null);
    } catch (e) {
      if (mounted.current) setError(getErrorMessage(e));
    } finally {
      if (mounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [load]);

  const reload = useCallback(async () => {
    if (hasData.current) setRefreshing(true);
    else setLoading(true);
    setError(null);
    await fetchData();
  }, [fetchData]);

  useEffect(() => {
    mounted.current = true;
    // State yalnızca await'ten sonra değişir; çağrı bir sonraki mikro göreve bırakılır
    Promise.resolve().then(fetchData);
    return () => {
      mounted.current = false;
    };
  }, [fetchData]);

  return { data, loading, refreshing, error, reload, reloadQuietly: fetchData };
}
