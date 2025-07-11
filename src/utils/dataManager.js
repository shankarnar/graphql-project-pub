const fs = require('fs').promises;
const path = require('path');
const { validateJSONStructure } = require('./validators');
const logger = require('./logger');

// Get data file path from environment
const DATA_FILE_PATH = path.resolve(process.env.DATA_FILE_PATH || './src/data/data.json');

/**
 * Read data from JSON file
 */
const readData = async () => {
  try {
    const startTime = Date.now();
    
    // Check if file exists
    await fs.access(DATA_FILE_PATH);
    
    // Read file content
    const fileContent = await fs.readFile(DATA_FILE_PATH, 'utf8');
    
    // Parse JSON
    const data = JSON.parse(fileContent);
    
    // Validate structure
    validateJSONStructure(data);
    
    const duration = Date.now() - startTime;
    logger.logPerformance('readData', duration, { 
      users: data.users.length, 
      posts: data.posts.length 
    });
    
    return data;
    
  } catch (error) {
    logger.logError('Error reading data file', error, { filePath: DATA_FILE_PATH });
    
    // If file doesn't exist, create it with default structure
    if (error.code === 'ENOENT') {
      logger.info('Data file not found, creating default structure');
      const defaultData = {
        users: [],
        posts: []
      };
      await writeData(defaultData);
      return defaultData;
    }
    
    throw new Error(`Failed to read data file: ${error.message}`);
  }
};

/**
 * Write data to JSON file
 */
const writeData = async (data) => {
  try {
    const startTime = Date.now();
    
    // Validate data structure before writing
    validateJSONStructure(data);
    
    // Ensure directory exists
    const dir = path.dirname(DATA_FILE_PATH);
    await fs.mkdir(dir, { recursive: true });
    
    // Create backup of current file
    try {
      await fs.access(DATA_FILE_PATH);
      const backupPath = `${DATA_FILE_PATH}.backup`;
      await fs.copyFile(DATA_FILE_PATH, backupPath);
    } catch (backupError) {
      // File doesn't exist, no backup needed
      logger.debug('No existing file to backup');
    }
    
    // Write data to file
    const jsonContent = JSON.stringify(data, null, 2);
    await fs.writeFile(DATA_FILE_PATH, jsonContent, 'utf8');
    
    const duration = Date.now() - startTime;
    logger.logPerformance('writeData', duration, { 
      users: data.users.length, 
      posts: data.posts.length 
    });
    
    logger.info('Data written successfully', { 
      filePath: DATA_FILE_PATH,
      users: data.users.length,
      posts: data.posts.length
    });
    
  } catch (error) {
    logger.logError('Error writing data file', error, { filePath: DATA_FILE_PATH });
    
    // Try to restore from backup if write failed
    try {
      const backupPath = `${DATA_FILE_PATH}.backup`;
      await fs.access(backupPath);
      await fs.copyFile(backupPath, DATA_FILE_PATH);
      logger.info('Data restored from backup after write failure');
    } catch (restoreError) {
      logger.error('Failed to restore from backup', restoreError);
    }
    
    throw new Error(`Failed to write data file: ${error.message}`);
  }
};

/**
 * Generate a unique ID
 */
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

/**
 * Find user by ID
 */
const findUserById = async (id) => {
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
    logger.logError('Error finding user by ID', error, { userId: id });
    throw error;
  }
};

/**
 * Find post by ID
 */
const findPostById = async (id) => {
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
    logger.logError('Error finding post by ID', error, { postId: id });
    throw error;
  }
};

/**
 * Find all users
 */
const findAllUsers = async () => {
  try {
    const data = await readData();
    logger.debug('Retrieved all users', { count: data.users.length });
    return data.users;
    
  } catch (error) {
    logger.logError('Error finding all users', error);
    throw error;
  }
};

/**
 * Find all posts
 */
const findAllPosts = async () => {
  try {
    const data = await readData();
    logger.debug('Retrieved all posts', { count: data.posts.length });
    return data.posts;
    
  } catch (error) {
    logger.logError('Error finding all posts', error);
    throw error;
  }
};

/**
 * Find posts by author ID
 */
const findPostsByAuthorId = async (authorId) => {
  try {
    const data = await readData();
    const posts = data.posts.filter(post => post.authorId === authorId);
    
    logger.debug('Retrieved posts by author', { authorId, count: posts.length });
    return posts;
    
  } catch (error) {
    logger.logError('Error finding posts by author ID', error, { authorId });
    throw error;
  }
};

/**
 * Find published posts
 */
const findPublishedPosts = async () => {
  try {
    const data = await readData();
    const publishedPosts = data.posts.filter(post => post.published === true);
    
    logger.debug('Retrieved published posts', { count: publishedPosts.length });
    return publishedPosts;
    
  } catch (error) {
    logger.logError('Error finding published posts', error);
    throw error;
  }
};

/**
 * Search users by name or email
 */
const searchUsers = async (searchTerm) => {
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
    logger.logError('Error searching users', error, { searchTerm });
    throw error;
  }
};

/**
 * Search posts by title or content
 */
const searchPosts = async (searchTerm) => {
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
    logger.logError('Error searching posts', error, { searchTerm });
    throw error;
  }
};

/**
 * Get database statistics
 */
const getStats = async () => {
  try {
    const data = await readData();
    const stats = {
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
    logger.logError('Error getting database statistics', error);
    throw error;
  }
};

/**
 * Validate data integrity
 */
const validateDataIntegrity = async () => {
  try {
    const data = await readData();
    const issues = [];
    
    // Check for orphaned posts (posts without valid authors)
    const orphanedPosts = data.posts.filter(post => {
      const authorExists = data.users.some(user => user.id === post.authorId);
      return !authorExists;
    });
    
    if (orphanedPosts.length > 0) {
      issues.push({
        type: 'ORPHANED_POSTS',
        count: orphanedPosts.length,
        items: orphanedPosts.map(post => ({ id: post.id, title: post.title }))
      });
    }
    
    // Check for users with invalid post references
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
        items: usersWithInvalidPosts.map(user => ({ id: user.id, name: user.name }))
      });
    }
    
    // Check for duplicate IDs
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
    logger.logError('Error validating data integrity', error);
    throw error;
  }
};

/**
 * Clean up orphaned data
 */
const cleanupOrphanedData = async () => {
  try {
    const data = await readData();
    let cleanupCount = 0;
    
    // Remove orphaned posts
    const originalPostCount = data.posts.length;
    data.posts = data.posts.filter(post => {
      const authorExists = data.users.some(user => user.id === post.authorId);
      if (!authorExists) {
        cleanupCount++;
        return false;
      }
      return true;
    });
    
    // Clean up invalid post references from users
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
    
    // Write cleaned data back to file
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
    logger.logError('Error cleaning up orphaned data', error);
    throw error;
  }
};

/**
 * Export data to backup
 */
const exportData = async (backupPath) => {
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
    logger.logError('Error exporting data', error, { backupPath });
    throw error;
  }
};

/**
 * Import data from backup
 */
const importData = async (backupPath) => {
  try {
    const backupContent = await fs.readFile(backupPath, 'utf8');
    const backupData = JSON.parse(backupContent);
    
    // Validate structure
    validateJSONStructure(backupData);
    
    // Remove metadata fields if they exist
    const importData = {
      users: backupData.users,
      posts: backupData.posts
    };
    
    // Write imported data
    await writeData(importData);
    
    logger.info('Data imported successfully', { 
      backupPath,
      users: importData.users.length,
      posts: importData.posts.length
    });
    
    return importData;
    
  } catch (error) {
    logger.logError('Error importing data', error, { backupPath });
    throw error;
  }
};

module.exports = {
  // Core CRUD operations
  readData,
  writeData,
  generateId,
  
  // Find operations
  findUserById,
  findPostById,
  findAllUsers,
  findAllPosts,
  findPostsByAuthorId,
  findPublishedPosts,
  
  // Search operations
  searchUsers,
  searchPosts,
  
  // Utility operations
  getStats,
  validateDataIntegrity,
  cleanupOrphanedData,
  
  // Backup operations
  exportData,
  importData
};