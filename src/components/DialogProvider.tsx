import { createContext, ReactNode, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Dialog, { DialogConfig } from './Dialog';

export type DialogOptions = Omit<DialogConfig, 'onPrimary' | 'onSecondary' | 'busy' | 'children'>;

interface DialogApi {
  // Onay penceresi: birincil düğme true, ikincil false
  confirm: (options: DialogOptions) => Promise<boolean>;
  // Tek düğmeli bilgi penceresi (Alert.alert yerine)
  alert: (options: { title: string; body: string; kicker?: string; tone?: DialogConfig['tone'] }) => Promise<void>;
}

const DialogContext = createContext<DialogApi | null>(null);

// Uygulama genelinde Dialog: sistem penceresi (Alert.alert) yerine tasarıma uygun pencere. Kökte bütün ekranların
// üstünde açılır. Aynı anda tek pencere: yenisi gelirse öncekinin sonucu false olur.
// Sınav ekranının kendi pencereleri (Pause, çıkış uyarıları, görev onayları) ekranın durumuna bağlı, onlar yerel.
export default function DialogProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<DialogOptions | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const close = useCallback((ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    setCurrent(null);
  }, []);

  const confirm = useCallback((options: DialogOptions) => {
    resolver.current?.(false);
    setCurrent(options);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const alert = useCallback<DialogApi['alert']>(
    async ({ title, body, kicker = 'BoostifyExam', tone }) => {
      await confirm({ kicker, title, body, tone, primaryLabel: 'OK' });
    },
    [confirm],
  );

  const api = useMemo(() => ({ confirm, alert }), [confirm, alert]);

  return (
    <DialogContext.Provider value={api}>
      <View style={styles.root}>
        {children}
        {current && (
          <Dialog
            {...current}
            onPrimary={() => close(true)}
            onSecondary={current.secondaryLabel ? () => close(false) : undefined}
          />
        )}
      </View>
    </DialogContext.Provider>
  );
}

export function useDialog(): DialogApi {
  const api = useContext(DialogContext);
  if (!api) throw new Error('useDialog must be used inside DialogProvider');
  return api;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
