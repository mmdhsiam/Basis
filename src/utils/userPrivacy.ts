import { UserProfile, UserRole } from '../types';

/**
 * Requirement 8 Privacy Policy:
 * Female member phone numbers are hidden/masked from ordinary members.
 * Only moderators (APP_MODERATOR / MODERATOR) or the user herself can see the full phone number.
 */
export function formatUserPhone(
  user: UserProfile,
  viewerRole?: UserRole,
  viewerId?: string
): string {
  if (!user.phone) return 'N/A';

  // If user is female
  if (user.gender === 'FEMALE') {
    const isModerator = viewerRole === 'APP_MODERATOR' || viewerRole === 'MODERATOR';
    const isSelf = viewerId && viewerId === user.id;

    if (isModerator || isSelf) {
      return user.phone;
    }

    // Mask for regular users: e.g. 017*****789 (গোপনীয়)
    if (user.phone.length >= 8) {
      const start = user.phone.slice(0, 3);
      const end = user.phone.slice(-3);
      return `${start}*****${end} (গোপনীয়)`;
    }
    return '017***** (গোপনীয়)';
  }

  return user.phone;
}

/**
 * Checks whether the viewer is permitted to see full contact details
 */
export function canViewFullPhone(
  user: UserProfile,
  viewerRole?: UserRole,
  viewerId?: string
): boolean {
  if (user.gender !== 'FEMALE') return true;
  const isModerator = viewerRole === 'APP_MODERATOR' || viewerRole === 'MODERATOR';
  return isModerator || (viewerId !== undefined && viewerId === user.id);
}
