// Request size and content validation utilities

import { CompletionRequest, Chat } from '../types';

// Size limits in bytes
export const SIZE_LIMITS = {
  // Default request body size (for most requests)
  defaultRequest: 2 * 1024 * 1024, // 2 MB

  // Chat operations (can include images)
  chatRequest: 10 * 1024 * 1024, // 10 MB

  // Message limits
  maxMessagesPerCompletion: 50,
  maxCharsPerMessage: 400000,
  
  // Storage limits
  maxChatStorageSize: 10 * 1024 * 1024, // 10 MB
};

// Chat count limits
export const MAX_CHATS_PER_APP = 1000;

/**
 * Validate request body size before parsing
 */
export async function validateRequestSize(
  request: Request,
  maxSize: number
): Promise<{ valid: boolean; error?: string; body?: string }> {
  // Clone the request to read the body
  const cloned = request.clone();
  
  try {
    const text = await cloned.text();
    const size = new TextEncoder().encode(text).length;
    
    if (size > maxSize) {
      return {
        valid: false,
        error: `Request body too large: ${formatBytes(size)} (max: ${formatBytes(maxSize)})`,
      };
    }
    
    return { valid: true, body: text };
  } catch (error) {
    return {
      valid: false,
      error: 'Failed to read request body',
    };
  }
}

/**
 * Validate completion request content
 */
export function validateCompletionContent(
  request: CompletionRequest
): { valid: boolean; error?: string } {
  // Check message count
  if (request.messages.length > SIZE_LIMITS.maxMessagesPerCompletion) {
    return {
      valid: false,
      error: `Too many messages: ${request.messages.length} (max: ${SIZE_LIMITS.maxMessagesPerCompletion})`,
    };
  }
  
  // Check individual message sizes
  for (let i = 0; i < request.messages.length; i++) {
    const message = request.messages[i];
    let contentLength = 0;
    
    if (typeof message.content === 'string') {
      contentLength = message.content.length;
    } else if (Array.isArray(message.content)) {
      // Count text parts
      for (const part of message.content) {
        if (part.type === 'text') {
          contentLength += part.text.length;
        }
      }
    }
    
    if (contentLength > SIZE_LIMITS.maxCharsPerMessage) {
      return {
        valid: false,
        error: `Message ${i} too large: ${contentLength} characters (max: ${SIZE_LIMITS.maxCharsPerMessage})`,
      };
    }
  }
  
  return { valid: true };
}

/**
 * Validate chat storage size
 */
export function validateChatSize(chat: Chat): { valid: boolean; error?: string } {
  const size = estimateChatSize(chat);
  
  if (size > SIZE_LIMITS.maxChatStorageSize) {
    return {
      valid: false,
      error: `Chat too large: ${formatBytes(size)} (max: ${formatBytes(SIZE_LIMITS.maxChatStorageSize)})`,
    };
  }
  
  return { valid: true };
}

/**
 * Estimate chat size in bytes
 */
function estimateChatSize(chat: Chat): number {
  // Serialize and measure
  const json = JSON.stringify(chat);
  return new TextEncoder().encode(json).length;
}

/**
 * Format bytes as human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Create size validation error response
 */
export function createSizeErrorResponse(error: string): Response {
  return new Response(
    JSON.stringify({
      error: 'Request validation failed',
      message: error,
    }),
    {
      status: 413, // Payload Too Large
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}
