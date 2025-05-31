/**
 * Post model interface for consistent post data structure
 */
export interface Post {
  id: string;
  title: string;
  body?: string;
  image?: string;
  author: string;
  community: string;
  createdAt: Date;
  upvotes: number;
  downvotes: number;
  comments: number;
}
