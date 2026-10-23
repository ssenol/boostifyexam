// Web'den (service.ueslms) `boostifyexam://login?token=...` ile gelen SSO token'ı için küçük bir kuyruk (BS / BW ile aynı).
// Link app/+native-intent.tsx'te yakalanır ama girişi orada yapamayız: store henüz rehydrate olmamış
// olabilir. Token burada bekletilir, PersistGate içindeki DeepLinkLoginHandler alıp girişi yapar.

type Listener = (token: string) => void;

let pendingToken: string | null = null;
let listener: Listener | null = null;

// URL veya path içindeki `token` query parametresini döner (yoksa null)
export function extractTokenFromUrl(url: string): string | null {
  const match = url.match(/[?&]token=([^&#]+)/);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

export function setPendingDeepLinkToken(token: string): void {
  if (listener) {
    listener(token);
  } else {
    pendingToken = token;
  }
}

// Bekleyen token varsa hemen, sonrakiler geldikçe dinleyiciye verilir
export function subscribeDeepLinkToken(next: Listener): () => void {
  listener = next;
  if (pendingToken) {
    const token = pendingToken;
    pendingToken = null;
    next(token);
  }
  return () => {
    if (listener === next) listener = null;
  };
}
