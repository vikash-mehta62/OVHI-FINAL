/**
 * RCM Frontend Helper Utilities
 * General helper functions for RCM components
 */

export interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

export interface FilterConfig {
  [key: string]: any;
}

export interface PaginationConfig {
  page: number;
  limit: number;
  total: number;
}

/**
 * Sort array of objects by specified key and direction
 * @param data - Array of objects to sort
 * @param sortConfig - Sort configuration
 * @returns Sorted array
 */
export const sortData = <T extends Record<string, any>>(
  data: T[],
  sortConfig: SortConfig
): T[] => {
  if (!sortConfig.key) return data;

  return [...data].sort((a, b) => {
    const aValue = getNestedValue(a, sortConfig.key);
    const bValue = getNestedValue(b, sortConfig.key);

    // Handle null/undefined values
    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return sortConfig.direction === 'asc' ? 1 : -1;
    if (bValue == null) return sortConfig.direction === 'asc' ? -1 : 1;

    // Handle different data types
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      const comparison = aValue.toLowerCase().localeCompare(bValue.toLowerCase());
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    }

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      const comparison = aValue - bValue;
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    }

    if (aValue instanceof Date && bValue instanceof Date) {
      const comparison = aValue.getTime() - bValue.getTime();
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    }

    // Fallback to string comparison
    const comparison = String(aValue).localeCompare(String(bValue));
    return sortConfig.direction === 'asc' ? comparison : -comparison;
  });
};

/**
 * Filter array of objects based on filter configuration
 * @param data - Array of objects to filter
 * @param filters - Filter configuration
 * @returns Filtered array
 */
export const filterData = <T extends Record<string, any>>(
  data: T[],
  filters: FilterConfig
): T[] => {
  return data.filter(item => {
    return Object.entries(filters).every(([key, filterValue]) => {
      if (filterValue == null || filterValue === '') return true;

      const itemValue = getNestedValue(item, key);

      // Handle array filters (multiple selections)
      if (Array.isArray(filterValue)) {
        if (filterValue.length === 0) return true;
        return filterValue.includes(itemValue);
      }

      // Handle string filters (search)
      if (typeof filterValue === 'string') {
        if (itemValue == null) return false;
        return String(itemValue).toLowerCase().includes(filterValue.toLowerCase());
      }

      // Handle number range filters
      if (typeof filterValue === 'object' && filterValue.min !== undefined && filterValue.max !== undefined) {
        if (itemValue == null) return false;
        const numValue = Number(itemValue);
        return numValue >= filterValue.min && numValue <= filterValue.max;
      }

      // Handle date range filters
      if (typeof filterValue === 'object' && filterValue.startDate && filterValue.endDate) {
        if (itemValue == null) return false;
        const itemDate = new Date(itemValue);
        const startDate = new Date(filterValue.startDate);
        const endDate = new Date(filterValue.endDate);
        return itemDate >= startDate && itemDate <= endDate;
      }

      // Exact match
      return itemValue === filterValue;
    });
  });
};

/**
 * Paginate array of data
 * @param data - Array of data to paginate
 * @param config - Pagination configuration
 * @returns Paginated data and metadata
 */
export const paginateData = <T>(
  data: T[],
  config: PaginationConfig
): {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
} => {
  const { page, limit } = config;
  const total = data.length;
  const totalPages = Math.ceil(total / limit);
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;

  return {
    data: data.slice(startIndex, endIndex),
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  };
};

/**
 * Get nested object value by dot notation key
 * @param obj - Object to get value from
 * @param key - Dot notation key (e.g., 'user.profile.name')
 * @returns Nested value or undefined
 */
export const getNestedValue = (obj: any, key: string): any => {
  return key.split('.').reduce((current, prop) => current?.[prop], obj);
};

/**
 * Set nested object value by dot notation key
 * @param obj - Object to set value in
 * @param key - Dot notation key
 * @param value - Value to set
 * @returns Modified object
 */
export const setNestedValue = (obj: any, key: string, value: any): any => {
  const keys = key.split('.');
  const lastKey = keys.pop()!;
  const target = keys.reduce((current, prop) => {
    if (current[prop] === undefined) current[prop] = {};
    return current[prop];
  }, obj);
  target[lastKey] = value;
  return obj;
};

/**
 * Debounce function execution
 * @param func - Function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced function
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

/**
 * Throttle function execution
 * @param func - Function to throttle
 * @param delay - Delay in milliseconds
 * @returns Throttled function
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let lastCall = 0;
  
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func(...args);
    }
  };
};

/**
 * Generate unique ID
 * @param prefix - Optional prefix for the ID
 * @returns Unique ID string
 */
export const generateId = (prefix: string = 'id'): string => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Deep clone object
 * @param obj - Object to clone
 * @returns Deep cloned object
 */
export const deepClone = <T>(obj: T): T => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T;
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as unknown as T;
  if (typeof obj === 'object') {
    const cloned = {} as T;
    Object.keys(obj).forEach(key => {
      (cloned as any)[key] = deepClone((obj as any)[key]);
    });
    return cloned;
  }
  return obj;
};

/**
 * Check if object is empty
 * @param obj - Object to check
 * @returns True if object is empty
 */
export const isEmpty = (obj: any): boolean => {
  if (obj == null) return true;
  if (Array.isArray(obj)) return obj.length === 0;
  if (typeof obj === 'object') return Object.keys(obj).length === 0;
  if (typeof obj === 'string') return obj.trim().length === 0;
  return false;
};

/**
 * Merge objects deeply
 * @param target - Target object
 * @param sources - Source objects to merge
 * @returns Merged object
 */
export const deepMerge = <T extends Record<string, any>>(
  target: T,
  ...sources: Partial<T>[]
): T => {
  if (!sources.length) return target;
  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        deepMerge(target[key], source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }

  return deepMerge(target, ...sources);
};

/**
 * Check if value is an object
 * @param item - Item to check
 * @returns True if item is an object
 */
const isObject = (item: any): boolean => {
  return item && typeof item === 'object' && !Array.isArray(item);
};

/**
 * Convert object to query string
 * @param obj - Object to convert
 * @returns Query string
 */
export const objectToQueryString = (obj: Record<string, any>): string => {
  const params = new URLSearchParams();
  
  Object.entries(obj).forEach(([key, value]) => {
    if (value != null) {
      if (Array.isArray(value)) {
        value.forEach(item => params.append(key, String(item)));
      } else {
        params.append(key, String(value));
      }
    }
  });
  
  return params.toString();
};

/**
 * Convert query string to object
 * @param queryString - Query string to convert
 * @returns Object representation
 */
export const queryStringToObject = (queryString: string): Record<string, any> => {
  const params = new URLSearchParams(queryString);
  const obj: Record<string, any> = {};
  
  for (const [key, value] of params.entries()) {
    if (obj[key]) {
      if (Array.isArray(obj[key])) {
        obj[key].push(value);
      } else {
        obj[key] = [obj[key], value];
      }
    } else {
      obj[key] = value;
    }
  }
  
  return obj;
};

/**
 * Format file size
 * @param bytes - File size in bytes
 * @returns Formatted file size string
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Download data as file
 * @param data - Data to download
 * @param filename - Filename for download
 * @param type - MIME type
 */
export const downloadFile = (
  data: string | Blob,
  filename: string,
  type: string = 'text/plain'
): void => {
  const blob = data instanceof Blob ? data : new Blob([data], { type });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/**
 * Copy text to clipboard
 * @param text - Text to copy
 * @returns Promise that resolves when text is copied
 */
export const copyToClipboard = async (text: string): Promise<void> => {
  try {
    await navigator.clipboard.writeText(text);
  } catch (err) {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
  }
};

/**
 * Get browser information
 * @returns Browser information object
 */
export const getBrowserInfo = (): {
  name: string;
  version: string;
  platform: string;
} => {
  const userAgent = navigator.userAgent;
  let name = 'Unknown';
  let version = 'Unknown';
  
  if (userAgent.includes('Chrome')) {
    name = 'Chrome';
    version = userAgent.match(/Chrome\/(\d+)/)?.[1] || 'Unknown';
  } else if (userAgent.includes('Firefox')) {
    name = 'Firefox';
    version = userAgent.match(/Firefox\/(\d+)/)?.[1] || 'Unknown';
  } else if (userAgent.includes('Safari')) {
    name = 'Safari';
    version = userAgent.match(/Version\/(\d+)/)?.[1] || 'Unknown';
  } else if (userAgent.includes('Edge')) {
    name = 'Edge';
    version = userAgent.match(/Edge\/(\d+)/)?.[1] || 'Unknown';
  }
  
  return {
    name,
    version,
    platform: navigator.platform
  };
};

/**
 * Check if device is mobile
 * @returns True if device is mobile
 */
export const isMobile = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};

/**
 * Get viewport dimensions
 * @returns Viewport width and height
 */
export const getViewportDimensions = (): { width: number; height: number } => {
  return {
    width: Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0),
    height: Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0)
  };
};

/**
 * Scroll to element
 * @param element - Element to scroll to
 * @param behavior - Scroll behavior
 */
export const scrollToElement = (
  element: HTMLElement | string,
  behavior: ScrollBehavior = 'smooth'
): void => {
  const target = typeof element === 'string' ? 
    document.querySelector(element) as HTMLElement : element;
  
  if (target) {
    target.scrollIntoView({ behavior, block: 'start' });
  }
};

/**
 * Local storage helpers with error handling
 */
export const storage = {
  get: <T>(key: string, defaultValue?: T): T | null => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue || null;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return defaultValue || null;
    }
  },
  
  set: (key: string, value: any): boolean => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Error writing to localStorage:', error);
      return false;
    }
  },
  
  remove: (key: string): boolean => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Error removing from localStorage:', error);
      return false;
    }
  },
  
  clear: (): boolean => {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.error('Error clearing localStorage:', error);
      return false;
    }
  }
};