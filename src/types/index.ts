export interface User {
  id: string;
  name: string;
  email: string;
  posts: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  published: boolean;
  authorId: string;
  createdAt: string;
  updatedAt: string;
}

export interface DataStore {
  users: User[];
  posts: Post[];
}

export interface CreateUserInput {
  name: string;
  email: string;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
}

export interface CreatePostInput {
  title: string;
  content: string;
  authorId: string;
  published?: boolean;
}

export interface UpdatePostInput {
  title?: string;
  content?: string;
  published?: boolean;
  authorId?: string;
}

export interface SearchInput {
  term: string;
  limit?: number;
  offset?: number;
}

export interface DeleteResponse {
  id: string;
  message: string;
}

export interface Stats {
  totalUsers: number;
  totalPosts: number;
  publishedPosts: number;
  unpublishedPosts: number;
  usersWithPosts: number;
  usersWithoutPosts: number;
}

export interface DataIntegrityIssue {
  type: string;
  count: number;
  items: string[];
}

export interface IntegrityReport {
  isValid: boolean;
  issues: DataIntegrityIssue[];
}

export interface CleanupResult {
  itemsRemoved: number;
  postsRemoved: number;
}

export interface GraphQLContext {
  request: Request;
  timestamp: string;
  userAgent: string;
}

export type QueryResolvers = {
  hello: () => string;
  users: () => Promise<User[]>;
  user: (parent: any, args: { id: string }) => Promise<User | null>;
  posts: () => Promise<Post[]>;
  post: (parent: any, args: { id: string }) => Promise<Post | null>;
  publishedPosts: () => Promise<Post[]>;
  postsByAuthor: (parent: any, args: { authorId: string }) => Promise<Post[]>;
  searchUsers: (parent: any, args: { input: SearchInput }) => Promise<User[]>;
  searchPosts: (parent: any, args: { input: SearchInput }) => Promise<Post[]>;
  stats: () => Promise<Stats>;
  validateIntegrity: () => Promise<IntegrityReport>;
};

export type MutationResolvers = {
  createUser: (parent: any, args: { input: CreateUserInput }) => Promise<User>;
  updateUser: (parent: any, args: { id: string; input: UpdateUserInput }) => Promise<User>;
  deleteUser: (parent: any, args: { id: string }) => Promise<DeleteResponse>;
  createPost: (parent: any, args: { input: CreatePostInput }) => Promise<Post>;
  updatePost: (parent: any, args: { id: string; input: UpdatePostInput }) => Promise<Post>;
  deletePost: (parent: any, args: { id: string }) => Promise<DeleteResponse>;
  togglePostPublished: (parent: any, args: { id: string }) => Promise<Post>;
  cleanupOrphanedData: () => Promise<CleanupResult>;
};

export type FieldResolvers = {
  User: {
    posts: (parent: User) => Promise<Post[]>;
  };
  Post: {
    author: (parent: Post) => Promise<User>;
  };
};

export type Logger = {
  debug: (message: string, meta?: Record<string, any>) => void;
  info: (message: string, meta?: Record<string, any>) => void;
  warn: (message: string, meta?: Record<string, any>) => void;
  error: (message: string, meta?: Record<string, any>) => void;
  logError: (message: string, error: Error, context?: Record<string, any>) => void;
  logGraphQLError: (error: Error, context?: Record<string, any>) => void;
  logPerformance: (operation: string, duration: number, context?: Record<string, any>) => void;
};

export type ValidationResult = {
  isValid: boolean;
  errors: string[];
};

export type ValidatorFunctions = {
  validateUserInput: (input: any) => string[];
  validatePostInput: (input: any) => string[];
  validateId: (id: any) => string[];
};

export interface EnvironmentConfig {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  DATA_FILE_PATH: string;
  LOG_LEVEL?: 'debug' | 'info' | 'warn' | 'error';
}

export class GraphQLCustomError extends Error {
  extensions: Record<string, any>;
  
  constructor(message: string, extensions: Record<string, any> = {}) {
    super(message);
    this.name = 'GraphQLCustomError';
    this.extensions = extensions;
  }
}