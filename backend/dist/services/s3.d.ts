export declare function getImagePublicUrl(key: string, bucket?: string): string;
/** Presigned GET for private buckets (1 hour). */
export declare function getImageViewUrl(key: string, bucket?: string, expiresIn?: number): Promise<string>;
export declare function getUploadPresignedUrl(key: string, contentType: string, expiresIn?: number): Promise<string>;
