import React from 'react';

interface UserStatusDotProps {
  isOnline?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Requirement 7:
 * Green dot for online/active users, Red dot for offline/inactive users.
 */
export const UserStatusDot: React.FC<UserStatusDotProps> = ({
  isOnline = true,
  className = '',
  size = 'sm',
}) => {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
  };

  return (
    <span
      className={`inline-block rounded-full shrink-0 transition-all ${sizeClasses[size]} ${
        isOnline
          ? 'bg-emerald-500 ring-2 ring-emerald-500/20'
          : 'bg-rose-500 ring-2 ring-rose-500/20'
      } ${className}`}
      title={isOnline ? 'অনলাইনে সক্রিয় (Online)' : 'অফলাইন (Offline)'}
    />
  );
};
