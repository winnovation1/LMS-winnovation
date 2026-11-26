export type NotificationType =
  | 'booking_created'
  | 'booking_cancelled'
  | 'milestone_reviewed'
  | 'investor_access_granted'
  | 'session_cancelled'
  | 'certificate_issued'
  | 'hr_message';

export interface NotificationDto {
  id: string;
  type: NotificationType;
  title: string;
  body?: string;
  read: boolean;
  createdAt: string;
}
