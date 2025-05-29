import { Component } from "solid-js";
import { formatDistanceToNow } from "date-fns";

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

interface PostCardProps {
  post: Post;
}

export const PostCard: Component<PostCardProps> = (props) => {
  const timeAgo = () => formatDistanceToNow(props.post.createdAt, { addSuffix: true });
  const score = () => props.post.upvotes - props.post.downvotes;
  return (
    <article class="bg-gray-700 rounded-lg shadow-sm overflow-hidden mb-4">
      <div class="flex">
        {/* Vote Section */}
        <div class="flex flex-col items-center p-4 bg-gray-800 min-w-[60px]">          <button 
            class="p-2 rounded-full hover:bg-gray-600 transition-colors"
            aria-label="Upvote"
          >
            <svg class="w-5 h-5 text-gray-300" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/>
            </svg>
          </button>
          
          <span class="text-gray-100 font-medium py-1">{score()}</span>
            <button 
            class="p-2 rounded-full hover:bg-gray-600 transition-colors"
            aria-label="Downvote"
          >
            <svg class="w-5 h-5 text-gray-300 rotate-180" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/>
            </svg>
          </button>
        </div>

        {/* Content Section */}
        <div class="flex-1 p-4">
          {/* Header */}
          <div class="flex items-center gap-2 text-sm text-gray-300 mb-2">
            <span class="font-medium text-primary">r/{props.post.community}</span>
            <span>•</span>
            <span>Posted by u/{props.post.author}</span>
            <span>•</span>
            <span>{timeAgo()}</span>
          </div>

          {/* Title */}
          <h2 class="text-lg font-semibold text-gray-100 mb-3 leading-tight">
            {props.post.title}
          </h2>

          {/* Body Text */}
          {props.post.body && (
            <p class="text-gray-300 mb-3 leading-relaxed">
              {props.post.body}
            </p>
          )}

          {/* Image */}
          {props.post.image && (
            <div class="mb-3">
              <img 
                src={props.post.image} 
                alt="Post content"
                class="max-w-full h-auto rounded"
              />
            </div>
          )}

          {/* Actions */}
          <div class="flex items-center gap-4 text-gray-300">            <button class="flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-600 transition-colors">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 6h-2v9H6v2c0 .55.45 1 1 1h11l4 4V7c0-.55-.45-1-1-1zm-4 6V3c0-.55-.45-1-1-1H3c-.55 0-1 .45-1 1v14l4-4h11c.55 0 1-.45 1-1z"/>
              </svg>
              <span class="text-sm">{props.post.comments} comments</span>
            </button>            <button class="flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-600 transition-colors">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92S19.61 16.08 18 16.08z"/>
              </svg>
              <span class="text-sm">Share</span>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};
