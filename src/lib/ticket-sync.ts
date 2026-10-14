type Listener = () => void;

const listeners = new Set<Listener>();

export function publishTicketRefresh() {
  listeners.forEach((listener) => listener());
}

export function subscribeTicketRefresh(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
