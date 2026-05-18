export declare function getImagePublicUrl(key: string, bucket?: string): string;
export declare function getUploadPresignedUrl(key: string, contentType: string, expiresIn?: number): Promise<string>;
