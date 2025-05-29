import { Post } from "~/components/PostCard";

export const mockPosts: Post[] = [
  {
    id: "1",
    title: "Just launched my first SolidJS app! Here's what I learned",
    body: "After months of development, I finally deployed my link aggregator. The experience was incredible - SolidJS's reactivity system made state management so much cleaner than other frameworks. The build times are lightning fast and the bundle size is tiny. Highly recommend giving it a try!",
    author: "devexplorer",
    community: "webdev", 
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    upvotes: 142,
    downvotes: 8,
    comments: 23
  },
  {
    id: "2", 
    title: "Beautiful sunset from my hiking trip last weekend",
    image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop",
    author: "naturelover",
    community: "EarthPorn",
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
    upvotes: 1247,
    downvotes: 32,
    comments: 89
  },
  {
    id: "3",
    title: "TIL: TypeScript's satisfies operator can help with type narrowing",
    body: "I just discovered this feature and it's a game changer! Instead of using type assertions that can be unsafe, the satisfies operator lets you check that a value satisfies a type while preserving the most specific type possible. Perfect for configuration objects and API responses.",
    author: "typescriptfan",
    community: "typescript",
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago  
    upvotes: 67,
    downvotes: 3,
    comments: 12
  },
  {
    id: "4",
    title: "My cat discovered the keyboard and accidentally deployed to production",
    body: "I left my laptop open for 5 minutes and came back to find my cat had somehow triggered our CI/CD pipeline. The deployment actually went through successfully and fixed a bug we'd been struggling with for days. I'm considering giving her commit access.",
    author: "catcoder",
    community: "ProgrammerHumor",
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
    upvotes: 2156,
    downvotes: 45,
    comments: 156
  },
  {
    id: "5",
    title: "Federated link aggregators: The future of social media?",
    body: "With increasing concerns about centralized platforms and data privacy, federated systems like this one might be the way forward. Users maintain control over their data while still being able to participate in a broader community. What are your thoughts on the tradeoffs?",
    author: "techphilosopher", 
    community: "technology",
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
    upvotes: 89,
    downvotes: 15,
    comments: 34
  }
];
