import { promises as fs } from 'fs';
import * as path from 'path';
import type { DataStore, User, Post, Stats, IntegrityReport, CleanupResult } from '../types';
import { validateJSONStructure } from './validators';
import logger from './logger';

const DATA_FILE_PATH = path.resolve(process.env.DATA_FILE_PATH || './src/data/data.json');

export const readData = async (): Promise<DataStore> => {
  try {
    const startTime = Date.now();
    
    await fs.access(DATA_FILE_PATH);
    
    const fileContent = await fs.readFile(DATA_FILE_PATH, 'utf8');
    
    const data = JSON.parse(fileContent);
    
    const validatedData = validateJSONStructure(data);
    
    const duration = Date.now() - startTime;
    logger.logPerformance('readData', duration, { 
      users: validatedData.users.length, 
      posts: validatedData.posts.length 
    });
    
    return validatedData;
    
  } catch (error) {
    logger.logError('Error reading data file', error as Error, { filePath: DATA_FILE_PATH });
    
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      logger.info('Data file not found, creating default structure');
      const defaultData: DataStore = {
        users: [],
        posts: []
      };
      await writeData(defaultData);
      return defaultData;
    }
    
    throw new Error(`Failed to read data file: ${(error as Error).message}`);
  }
};

export const writeData = async (data: DataStore): Promise<void> => {
  try {
    const startTime = Date.now();
    
    const validatedData = validateJSONStructure(data);
    
    const dir = path.dirname(DATA_FILE_PATH);
    await fs.mkdir(dir, { recursive: true });
    
    try {
      await fs.access(DATA_FILE_PATH);
      const backupPath = `${DATA_FILE_PATH}.backup`;
      await fs.copyFile(DATA_FILE_PATH, backupPath);
    } catch (backupError) {
      logger.debug('No existing file to backup');
    }
    
    const jsonContent = JSON.stringify(validatedData, null, 2);
    await fs.writeFile(DATA_FILE_PATH, jsonContent, 'utf8');
    
    const duration = Date.now() - startTime;
    logger.logPerformance('writeData', duration, { 
      users: validatedData.users.length, 
      posts: validatedData.posts.length 
    });
    
    logger.info('Data written successfully', { 
      filePath: DATA_FILE_PATH,
      users: validatedData.users.length,
      posts: validatedData.posts.length
    });
    
  } catch (error) {
    logger.logError('Error writing data file', error as Error, { filePath: DATA_FILE_PATH });
    
    try {
      const backupPath = `${DATA_FILE_PATH}.backup`;
      await fs.access(backupPath);
      await fs.copyFile(backupPath, DATA_FILE_PATH);
      logger.info('Data restored from backup after write failure');
    } catch (restoreError) {
      logger.error('Failed to restore from backup', { 
        error: restoreError instanceof Error ? restoreError.message : String(restoreError) 
      });
    }
    
    throw new Error(`Failed to write data file: ${(error as Error).message}`);
  }
};


export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};


export const findUserById = async (id: string): Promise<User | null> => {
  try {
    const data = await readData();
    const user = data.users.find(user => user.id === id);
    
    if (!user) {
      logger.debug('User not found', { userId: id });
      return null;
    }
    
    logger.debug('User found', { userId: id, name: user.name });
    return user;
    
  } catch (error) {
    logger.logError('Error finding user by ID', error as Error, { userId: id });
    throw error;
  }
};


export const findPostById = async (id: string): Promise<Post | null> => {
  try {
    const data = await readData();
    const post = data.posts.find(post => post.id === id);
    
    if (!post) {
      logger.debug('Post not found', { postId: id });
      return null;
    }
    
    logger.debug('Post found', { postId: id, title: post.title });
    return post;
    
  } catch (error) {
    logger.logError('Error finding post by ID', error as Error, { postId: id });
    throw error;
  }
};


export const findAllUsers = async (): Promise<User[]> => {
  try {
    const data = await readData();
    logger.debug('Retrieved all users', { count: data.users.length });
    return data.users;
    
  } catch (error) {
    logger.logError('Error finding all users', error as Error);
    throw error;
  }
};


export const findAllPosts = async (): Promise<Post[]> => {
  try {
    const data = await readData();
    logger.debug('Retrieved all posts', { count: data.posts.length });
    return data.posts;
    
  } catch (error) {
    logger.logError('Error finding all posts', error as Error);
    throw error;
  }
};


export const findPostsByAuthorId = async (authorId: string): Promise<Post[]> => {
  try {
    const data = await readData();
    const posts = data.posts.filter(post => post.authorId === authorId);
    
    logger.debug('Retrieved posts by author', { authorId, count: posts.length });
    return posts;
    
  } catch (error) {
    logger.logError('Error finding posts by author ID', error as Error, { authorId });
    throw error;
  }
};


export const findPublishedPosts = async (): Promise<Post[]> => {
  try {
    const data = await readData();
    const publishedPosts = data.posts.filter(post => post.published === true);
    
    logger.debug('Retrieved published posts', { count: publishedPosts.length });
    return publishedPosts;
    
  } catch (error) {
    logger.logError('Error finding published posts', error as Error);
    throw error;
  }
};


export const searchUsers = async (searchTerm: string): Promise<User[]> => {
  try {
    const data = await readData();
    const normalizedSearch = searchTerm.toLowerCase();
    
    const matchingUsers = data.users.filter(user => 
      user.name.toLowerCase().includes(normalizedSearch) ||
      user.email.toLowerCase().includes(normalizedSearch)
    );
    
    logger.debug('User search completed', { 
      searchTerm, 
      results: matchingUsers.length 
    });
    
    return matchingUsers;
    
  } catch (error) {
    logger.logError('Error searching users', error as Error, { searchTerm });
    throw error;
  }
};


export const searchPosts = async (searchTerm: string): Promise<Post[]> => {
  try {
    const data = await readData();
    const normalizedSearch = searchTerm.toLowerCase();
    
    const matchingPosts = data.posts.filter(post => 
      post.title.toLowerCase().includes(normalizedSearch) ||
      post.content.toLowerCase().includes(normalizedSearch)
    );
    
    logger.debug('Post search completed', { 
      searchTerm, 
      results: matchingPosts.length 
    });
    
    return matchingPosts;
    
  } catch (error) {
    logger.logError('Error searching posts', error as Error, { searchTerm });
    throw error;
  }
};


export const getStats = async (): Promise<Stats> => {
  try {
    const data = await readData();
    const stats: Stats = {
      totalUsers: data.users.length,
      totalPosts: data.posts.length,
      publishedPosts: data.posts.filter(post => post.published).length,
      unpublishedPosts: data.posts.filter(post => !post.published).length,
      usersWithPosts: data.users.filter(user => user.posts && user.posts.length > 0).length,
      usersWithoutPosts: data.users.filter(user => !user.posts || user.posts.length === 0).length
    };
    
    logger.debug('Database statistics generated', stats);
    return stats;
    
  } catch (error) {
    logger.logError('Error getting database statistics', error as Error);
    throw error;
  }
};


export const validateDataIntegrity = async (): Promise<IntegrityReport> => {
  try {
    const data = await readData();
    const issues: IntegrityReport['issues'] = [];
    
    const orphanedPosts = data.posts.filter(post => {
      const authorExists = data.users.some(user => user.id === post.authorId);
      return !authorExists;
    });
    
    if (orphanedPosts.length > 0) {
      issues.push({
        type: 'ORPHANED_POSTS',
        count: orphanedPosts.length,
        items: orphanedPosts.map(post => `${post.id}: ${post.title}`)
      });
    }
    
    const usersWithInvalidPosts = data.users.filter(user => {
      if (!user.posts || user.posts.length === 0) return false;
      
      const invalidPosts = user.posts.filter(postId => {
        const postExists = data.posts.some(post => post.id === postId);
        return !postExists;
      });
      
      return invalidPosts.length > 0;
    });
    
    if (usersWithInvalidPosts.length > 0) {
      issues.push({
        type: 'INVALID_POST_REFERENCES',
        count: usersWithInvalidPosts.length,
        items: usersWithInvalidPosts.map(user => `${user.id}: ${user.name}`)
      });
    }
    
    const userIds = data.users.map(user => user.id);
    const duplicateUserIds = userIds.filter((id, index) => userIds.indexOf(id) !== index);
    
    if (duplicateUserIds.length > 0) {
      issues.push({
        type: 'DUPLICATE_USER_IDS',
        count: duplicateUserIds.length,
        items: duplicateUserIds
      });
    }
    
    const postIds = data.posts.map(post => post.id);
    const duplicatePostIds = postIds.filter((id, index) => postIds.indexOf(id) !== index);
    
    if (duplicatePostIds.length > 0) {
      issues.push({
        type: 'DUPLICATE_POST_IDS',
        count: duplicatePostIds.length,
        items: duplicatePostIds
      });
    }
    
    logger.info('Data integrity validation completed', { 
      totalIssues: issues.length,
      issues: issues.map(issue => ({ type: issue.type, count: issue.count }))
    });
    
    return {
      isValid: issues.length === 0,
      issues
    };
    
  } catch (error) {
    logger.logError('Error validating data integrity', error as Error);
    throw error;
  }
};

export const cleanupOrphanedData = async (): Promise<CleanupResult> => {
  try {
    const data = await readData();
    let cleanupCount = 0;
    
    const originalPostCount = data.posts.length;
    data.posts = data.posts.filter(post => {
      const authorExists = data.users.some(user => user.id === post.authorId);
      if (!authorExists) {
        cleanupCount++;
        return false;
      }
      return true;
    });
    
    data.users.forEach(user => {
      if (user.posts && user.posts.length > 0) {
        const originalLength = user.posts.length;
        user.posts = user.posts.filter(postId => {
          const postExists = data.posts.some(post => post.id === postId);
          if (!postExists) {
            cleanupCount++;
            return false;
          }
          return true;
        });
        
        if (user.posts.length !== originalLength) {
          user.updatedAt = new Date().toISOString();
        }
      }
    });
    
    if (cleanupCount > 0) {
      await writeData(data);
    }
    
    logger.info('Data cleanup completed', { 
      itemsRemoved: cleanupCount,
      postsRemoved: originalPostCount - data.posts.length
    });
    
    return {
      itemsRemoved: cleanupCount,
      postsRemoved: originalPostCount - data.posts.length
    };
    
  } catch (error) {
    logger.logError('Error cleaning up orphaned data', error as Error);
    throw error;
  }
};


export const exportData = async (backupPath?: string): Promise<string> => {
  try {
    const data = await readData();
    const exportData = {
      ...data,
      exportedAt: new Date().toISOString(),
      version: '1.0.0'
    };
    
    const backupFile = backupPath || `./backup-${Date.now()}.json`;
    await fs.writeFile(backupFile, JSON.stringify(exportData, null, 2), 'utf8');
    
    logger.info('Data exported successfully', { 
      backupFile,
      users: data.users.length,
      posts: data.posts.length
    });
    
    return backupFile;
    
  } catch (error) {
    logger.logError('Error exporting data', error as Error, { backupPath });
    throw error;
  }
};

export const importData = async (backupPath: string): Promise<DataStore> => {
  try {
    const backupContent = await fs.readFile(backupPath, 'utf8');
    const backupData = JSON.parse(backupContent);
    
    const validatedData = validateJSONStructure(backupData);
    
    const importData: DataStore = {
      users: validatedData.users,
      posts: validatedData.posts
    };

    await writeData(importData);
    
    logger.info('Data imported successfully', { 
      backupPath,
      users: importData.users.length,
      posts: importData.posts.length
    });
    
    return importData;
    
  } catch (error) {
    logger.logError('Error importing data', error as Error, { backupPath });
    throw error;
  }
};