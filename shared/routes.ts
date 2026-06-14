import { z } from 'zod';
import { insertBubbleSchema, insertUrlSchema, bubbles, detectedUrls } from './schema';

// ============================================
// SHARED ERROR SCHEMAS
// ============================================
export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

// ============================================
// API CONTRACT
// ============================================
export const api = {
  // === SYSTEM MONITORING (AI EYES) ===
  system: {
    stats: {
      method: 'GET' as const,
      path: '/api/system/stats',
      responses: {
        200: z.object({
          system: z.object({
            cpu: z.string(),
            memory: z.string(),
            disk: z.string(),
            uptime: z.string(),
            timestamp: z.number(),
          }),
          processes: z.array(z.object({
            pid: z.string(),
            cpu: z.string(),
            mem: z.string(),
            command: z.string(),
          })),
          services: z.array(z.object({
            name: z.string(),
            port: z.number(),
            status: z.enum(['open', 'closed']),
            url: z.string().optional(),
          })),
          errors: z.array(z.string()),
          models: z.object({
            current: z.string(),
            available: z.number(),
            type: z.string(),
          }),
        }),
      },
    },
  },

  // === FILE SYSTEM ===
  fs: {
    list: {
      method: 'GET' as const,
      path: '/api/fs/list',
      input: z.object({
        path: z.string().optional(),
      }),
      responses: {
        200: z.object({
          cwd: z.string(),
          items: z.array(z.object({
            name: z.string(),
            path: z.string(),
            type: z.enum(['file', 'directory']),
            size: z.number(),
            mtime: z.number(),
          })),
        }),
        400: errorSchemas.validation,
      },
    },
    read: {
      method: 'POST' as const,
      path: '/api/fs/read',
      input: z.object({
        path: z.string(),
      }),
      responses: {
        200: z.object({
          content: z.string(),
          path: z.string(),
          encoding: z.string(),
        }),
        404: errorSchemas.notFound,
      },
    },
    write: {
      method: 'POST' as const,
      path: '/api/fs/write',
      input: z.object({
        path: z.string(),
        content: z.string(),
      }),
      responses: {
        200: z.object({ success: z.boolean() }),
        500: errorSchemas.internal,
      },
    },
    delete: {
      method: 'POST' as const,
      path: '/api/fs/delete',
      input: z.object({
        path: z.string(),
      }),
      responses: {
        200: z.object({ success: z.boolean() }),
      },
    },
  },

  // === BUBBLES (UI STATE) ===
  bubbles: {
    list: {
      method: 'GET' as const,
      path: '/api/bubbles',
      responses: {
        200: z.array(z.custom<typeof bubbles.$inferSelect>()),
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/bubbles/:id',
      input: insertBubbleSchema.partial(),
      responses: {
        200: z.custom<typeof bubbles.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    reset: {
      method: 'POST' as const,
      path: '/api/bubbles/reset',
      responses: {
        200: z.array(z.custom<typeof bubbles.$inferSelect>()),
      },
    },
  },

  // === DETECTED URLS ===
  urls: {
    list: {
      method: 'GET' as const,
      path: '/api/urls',
      responses: {
        200: z.array(z.custom<typeof detectedUrls.$inferSelect>()),
      },
    },
    add: {
      method: 'POST' as const,
      path: '/api/urls',
      input: insertUrlSchema.omit({ id: true, timestamp: true }),
      responses: {
        201: z.custom<typeof detectedUrls.$inferSelect>(),
      },
    },
  },

  // === AI CHAT ===
  chat: {
    send: {
      method: 'POST' as const,
      path: '/api/chat',
      input: z.object({
        message: z.string(),
        model: z.string().optional(),
        context: z.string().optional(), // e.g., current file content
      }),
      responses: {
        200: z.object({
          response: z.string(),
          urls: z.array(z.string()), // URLs detected in response
        }),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
