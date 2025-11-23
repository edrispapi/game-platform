// S3 Configuration for File Storage
// For Cloudflare Workers, use Cloudflare R2 (S3-compatible) or AWS S3

export interface S3Config {
  endpoint: string; // S3 endpoint URL
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

// Cloudflare R2 (S3-compatible) Configuration
export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

// S3 Client using AWS SDK or R2
export class S3Client {
  private config: S3Config | R2Config;
  private isR2: boolean;
  
  constructor(config: S3Config | R2Config, isR2: boolean = false) {
    this.config = config;
    this.isR2 = isR2;
  }
  
  async uploadFile(
    key: string,
    file: ArrayBuffer | Uint8Array,
    contentType: string,
    metadata?: Record<string, string>
  ): Promise<string> {
    // For Cloudflare Workers, use R2 bindings
    if (this.isR2) {
      // R2 binding would be available in env
      // const object = await env.R2_BUCKET.put(key, file, {
      //   httpMetadata: { contentType },
      //   customMetadata: metadata,
      // });
      // return `https://${this.config.bucket}.r2.cloudflarestorage.com/${key}`;
      throw new Error('R2 implementation needed');
    }
    
    // For AWS S3
    const url = `${this.config.endpoint}/${this.config.bucket}/${key}`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
        ...(metadata && Object.entries(metadata).reduce((acc, [k, v]) => {
          acc[`x-amz-meta-${k}`] = v;
          return acc;
        }, {} as Record<string, string>)),
      },
      body: file,
    });
    
    if (!response.ok) {
      throw new Error(`Failed to upload file: ${response.statusText}`);
    }
    
    return url;
  }
  
  async deleteFile(key: string): Promise<void> {
    const url = `${this.config.endpoint}/${this.config.bucket}/${key}`;
    const response = await fetch(url, {
      method: 'DELETE',
    });
    
    if (!response.ok && response.status !== 404) {
      throw new Error(`Failed to delete file: ${response.statusText}`);
    }
  }
  
  async getFileUrl(key: string, expiresIn?: number): Promise<string> {
    if (this.isR2) {
      return `https://${this.config.bucket}.r2.cloudflarestorage.com/${key}`;
    }
    
    // For S3, generate presigned URL if expiresIn is provided
    return `${this.config.endpoint}/${this.config.bucket}/${key}`;
  }
}

// File paths structure
export const FILE_PATHS = {
  userAvatars: 'avatars/',
  gameCovers: 'games/covers/',
  gameBanners: 'games/banners/',
  gameScreenshots: 'games/screenshots/',
  workshopItems: 'workshop/items/',
  achievementIcons: 'achievements/icons/',
} as const;

export function getFilePath(type: keyof typeof FILE_PATHS, filename: string): string {
  return `${FILE_PATHS[type]}${filename}`;
}

