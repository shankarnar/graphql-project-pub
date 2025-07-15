import type { User, Post, DataStore } from '../src/types';

// Jest setup file for global test configuration

process.env.NODE_ENV = 'test';
process.env.DATA_FILE_PATH = './tests/fixtures/test-data.json';
process.env.PORT = '0'; 


jest.setTimeout(10000);


global.console = {
  ...console,

  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
};

declare global {
  namespace NodeJS {
    interface Global {
      testUtils: {
        createTestUser: (overrides?: Partial<User>) => User;
        createTestPost: (overrides?: Partial<Post>) => Post;
        createTestData: () => DataStore;
      };
    }
  }
}

global.testUtils = {
  createTestUser: (overrides: Partial<User> = {}): User => ({
    id: 'test-user-1',
    name: 'Test User',
    email: 'test@example.com',
    posts: [],
    createdAt: '2025-01-01T10:00:00.000Z',
    updatedAt: '2025-01-01T10:00:00.000Z',
    ...overrides
  }),

  createTestPost: (overrides: Partial<Post> = {}): Post => ({
    id: 'test-post-1',
    title: 'Test Post',
    content: 'Test content',
    published: true,
    authorId: 'test-user-1',
    createdAt: '2025-01-01T11:00:00.000Z',
    updatedAt: '2025-01-01T11:00:00.000Z',
    ...overrides
  }),

  createTestData: (): DataStore => ({
    users: [
      global.testUtils.createTestUser(),
      global.testUtils.createTestUser({
        id: 'test-user-2',
        name: 'Test User 2',
        email: 'test2@example.com'
      })
    ],
    posts: [
      global.testUtils.createTestPost(),
      global.testUtils.createTestPost({
        id: 'test-post-2',
        title: 'Test Post 2',
        authorId: 'test-user-2'
      })
    ]
  })
};

afterEach(() => {
  jest.clearAllMocks();
});

export const testUtils = global.testUtils;