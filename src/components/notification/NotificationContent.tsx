import React, { useState } from "react";
import { api } from "../../utils/api";
import { useSession } from "next-auth/react";

// Define notification type
interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  entity_type?: string;
  sender?: {
    id: string;
    name: string;
    email: string;
    avatar_url: string;
  } | null;
}

const NotificationContent: React.FC = () => {
  const { data: session } = useSession();
  const [onlyUnread, setOnlyUnread] = useState(false);

  // Fetch notifications with the filter option
  const { 
    data: notificationsData, 
    isLoading: notificationsLoading, 
    error: notificationsError,
    refetch: refetchNotifications
  } = api.notification.getAll.useQuery(
    { read: onlyUnread ? false : undefined },
    { enabled: !!session }
  );

  // Fetch unread count
  const { 
    data: unreadCountData, 
    isLoading: unreadCountLoading,
    refetch: refetchUnreadCount
  } = api.notification.getUnreadCount.useQuery(
    undefined,
    { enabled: !!session }
  );

  // Mark as read mutation
  const markAsReadMutation = api.notification.markAsRead.useMutation({
    onSuccess: () => {
      refetchNotifications();
      refetchUnreadCount();
    }
  });

  // Mark all as read mutation
  const markAllAsReadMutation = api.notification.markAllAsRead.useMutation({
    onSuccess: () => {
      refetchNotifications();
      refetchUnreadCount();
    }
  });

  // Delete notification mutation
  const deleteNotificationMutation = api.notification.delete.useMutation({
    onSuccess: () => {
      refetchNotifications();
      refetchUnreadCount();
    }
  });

  // Handle mark as read
  const handleMarkAsRead = (id: string) => {
    markAsReadMutation.mutate({ id });
  };

  // Handle mark all as read
  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  // Handle delete notification
  const handleDeleteNotification = (id: string) => {
    deleteNotificationMutation.mutate({ id });
  };

  if (!session) {
    return (
      <div className="container mx-auto p-4">
        <p>Please sign in to view notifications</p>
      </div>
    );
  }

  if (notificationsLoading) {
    return (
      <div className="container mx-auto p-4">
        <p>Loading notifications...</p>
      </div>
    );
  }

  if (notificationsError) {
    return (
      <div className="container mx-auto p-4">
        <p>Error loading notifications: {notificationsError.message}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold">Notifications Test</h1>
      
      <div className="mb-4 flex items-center justify-between">
        <div>
          <label className="mr-2 inline-flex items-center">
            <input
              type="checkbox"
              className="form-checkbox h-5 w-5"
              checked={onlyUnread}
              onChange={(e) => setOnlyUnread(e.target.checked)}
            />
            <span className="ml-2">Show only unread</span>
          </label>
        </div>
        
        <div className="flex items-center">
          <span className="mr-4 rounded-full bg-blue-500 px-2 py-1 text-sm text-white">
            {unreadCountLoading ? "..." : unreadCountData?.count || 0} unread
          </span>
          <button
            onClick={handleMarkAllAsRead}
            className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
            disabled={markAllAsReadMutation.isPending}
          >
            {markAllAsReadMutation.isPending ? "Marking..." : "Mark all as read"}
          </button>
        </div>
      </div>
      
      <div className="space-y-4">
        {!notificationsData || notificationsData.notifications.length === 0 ? (
          <p className="text-center text-gray-500">No notifications found</p>
        ) : (
          notificationsData.notifications.map((notification: Notification) => (
            <div
              key={notification.id}
              className={`rounded-lg border p-4 shadow ${
                !notification.read ? "border-blue-300 bg-blue-50" : "border-gray-200"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold">{notification.title}</h3>
                  <p className="text-gray-700">{notification.message}</p>
                  <div className="mt-2 text-sm text-gray-500">
                    <span>
                      {new Date(notification.created_at).toLocaleString()}
                    </span>
                    {notification.sender && (
                      <span className="ml-2">
                        From: {notification.sender.name}
                      </span>
                    )}
                    {notification.entity_type && (
                      <span className="ml-2">
                        Type: {notification.entity_type}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex space-x-2">
                  {!notification.read && (
                    <button
                      onClick={() => handleMarkAsRead(notification.id)}
                      className="rounded bg-green-500 px-3 py-1 text-sm text-white hover:bg-green-600"
                      disabled={markAsReadMutation.isPending}
                    >
                      Mark as read
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteNotification(notification.id)}
                    className="rounded bg-red-500 px-3 py-1 text-sm text-white hover:bg-red-600"
                    disabled={deleteNotificationMutation.isPending}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationContent;
