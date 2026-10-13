export type SocialMutation =
  | { type: 'like'; eventId: string; liked: boolean; likeCount?: number }
  | { type: 'follow'; promoterId: string; following: boolean; followers?: number };

type Listener = (mutation: SocialMutation) => void;

const listeners = new Set<Listener>();

export function publishSocialMutation(mutation: SocialMutation) {
  listeners.forEach((listener) => listener(mutation));
}

export function subscribeSocialMutations(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
