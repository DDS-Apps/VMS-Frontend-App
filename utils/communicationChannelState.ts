// Presentation-only: retain SMS state and payload support while hiding its chip.
export const SHOW_SMS_CHANNEL = false;

export function getEmailChannelState(email: string, selected: boolean) {
  const enabled = email.trim().length > 0;
  return { enabled, selected: enabled && selected };
}
