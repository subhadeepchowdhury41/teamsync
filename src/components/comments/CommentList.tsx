import { useState, useEffect } from "react";
import { api } from "@/utils/api";
import { useSession } from "next-auth/react";
import { formatDistanceToNow } from "date-fns";
import { AppRouter } from "@/server/trpc";
import { TRPCError } from "@trpc/server";

interface CommentListProps {
  taskId: string;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user: {
    id: string;
    name: string | null;
    avatar_url: string | null;
  };
}

export function CommentList({ taskId }: CommentListProps) {
  const { data: session } = useSession();
  
  // Initialize state hooks first (before any conditional returns)
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const utils = api.useUtils();
  
  // Get userId from session (only used after the authentication check)
  const userId = session?.user?.id;

  // Check if user is authenticated
  if (!session?.user) {
    return null;
  }

  // Query to fetch comments for the task
  const {
    data: commentsData,
    isLoading,
    error: fetchError,
  } = api.comment.getByTask.useQuery({ taskId }, { enabled: !!taskId });

  // Handle fetch error
  useEffect(() => {
    if (fetchError) {
      setError(fetchError.message);
    }
  }, [fetchError]);

  // Mutation to create a new comment
  const createCommentMutation = api.comment.create.useMutation({
    onSuccess: () => {
      // Reset form and refetch comments
      setNewComment("");
      setIsSubmitting(false);
      setError(null);
      void utils.comment.getByTask.invalidate({ taskId });
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  // Mutation to delete a comment
  const deleteCommentMutation = api.comment.delete.useMutation({
    onSuccess: () => {
      setError(null);
      void utils.comment.getByTask.invalidate({ taskId });
    },
    onError: (error) => {
      console.error("Failed to delete comment:", error);
      setError(error.message);
    },
  });

  // Handle comment submission
  const handleSubmitComment = () => {
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    createCommentMutation.mutate({
      taskId,
      content: newComment.trim(),
    });
  };

  // Handle comment deletion
  const handleDeleteComment = (commentId: string) => {
    if (confirm("Are you sure you want to delete this comment?")) {
      deleteCommentMutation.mutate({ id: commentId });
    }
  };

  return (
    <div className="mt-6 space-y-4">
      <h3 className="text-lg font-medium">Comments</h3>

      {/* Error message */}
      {error && <div className="mb-4 text-center text-red-500">{error}</div>}

      {/* Comment input */}
      <div className="flex flex-col space-y-2">
        <textarea
          placeholder="Add a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="min-h-[80px] w-full rounded-lg border p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex justify-end">
          <button
            onClick={handleSubmitComment}
            disabled={
              !newComment.trim() ||
              isSubmitting ||
              createCommentMutation.isPending
            }
            className={`rounded-lg px-4 py-2 transition-colors ${
              !newComment.trim() ||
              isSubmitting ||
              createCommentMutation.isPending
                ? "cursor-not-allowed bg-gray-300"
                : "bg-blue-500 text-white hover:bg-blue-600"
            }`}
          >
            {isSubmitting || createCommentMutation.isPending
              ? "Posting..."
              : "Post Comment"}
          </button>
        </div>
      </div>

      {/* Comments list */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="py-4 text-center">Loading comments...</div>
        ) : commentsData?.comments.length === 0 ? (
          <div className="py-4 text-center text-gray-500">No comments yet</div>
        ) : (
          commentsData?.comments.map((comment: Comment) => (
            <div
              key={comment.id}
              className="flex space-x-3 border-b border-gray-100 pb-4"
            >
              <img
                src={comment.user.avatar_url || "/default-avatar.png"}
                alt={comment.user.name || "User avatar"}
                className="h-8 w-8 rounded-full"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">
                      {comment.user.name || "Anonymous"}
                    </span>
                    <span className="text-sm text-gray-500">
                      {formatDistanceToNow(new Date(comment.created_at), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  {comment.user.id === session?.user?.id && (
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      disabled={deleteCommentMutation.isPending}
                      className={`rounded-lg px-3 py-1 text-sm transition-colors ${
                        deleteCommentMutation.isPending
                          ? "cursor-not-allowed bg-gray-300 text-gray-500"
                          : "bg-red-500 text-white hover:bg-red-600"
                      }`}
                    >
                      {deleteCommentMutation.isPending
                        ? "Deleting..."
                        : "Delete"}
                    </button>
                  )}
                </div>
                <div className="mt-2 whitespace-pre-wrap text-gray-700">
                  {comment.content}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
