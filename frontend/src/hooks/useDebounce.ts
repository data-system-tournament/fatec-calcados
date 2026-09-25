import { useEffect, useState } from "react";

// Valor que só muda `delay` ms depois da última alteração (para não buscar a cada tecla digitada).
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
