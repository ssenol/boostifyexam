import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from './index';

// TS dosyalarında useDispatch/useSelector yerine bunları kullanın
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
