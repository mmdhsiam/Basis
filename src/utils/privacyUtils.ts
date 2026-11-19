import { UserProfile } from '../types';

/**
 * Requirement 8: Privacy protection for female members.
 * Female members' phone numbers are hidden/masked for regular users.
 * Only APP_MODERATOR, MODERATOR, and the member herself can view the full phone number.
 */
export function getMaskedPhone(
  targetMember: UserProfile | null | undefined,
  currentViewer: UserProfile | null | undefined
): {
  displayText: string;
  isMasked: boolean;
  canCall: boolean;
  rawPhone: string;
} {
  if (!targetMember || !targetMember.phone) {
    return { displayText: 'N/A', isMasked: false, canCall: false, rawPhone: '' };
  }

  const isViewerModerator =
    currentViewer?.role === 'APP_MODERATOR' || currentViewer?.role === 'MODERATOR';
  const isSelf = currentViewer?.id === targetMember.id;

  if (targetMember.gender === 'FEMALE') {
    if (isViewerModerator || isSelf) {
      return {
        displayText: targetMember.phone,
        isMasked: false,
        canCall: true,
        rawPhone: targetMember.phone,
      };
    } else {
      // Mask phone for regular members
      const prefix = targetMember.phone.slice(0, 3) || '০১';
      return {
        displayText: `${prefix}•••••••• (সুরক্ষিত)`,
        isMasked: true,
        canCall: false,
        rawPhone: '',
      };
    }
  }

  // Male or Other members
  return {
    displayText: targetMember.phone,
    isMasked: false,
    canCall: true,
    rawPhone: targetMember.phone,
  };
}
