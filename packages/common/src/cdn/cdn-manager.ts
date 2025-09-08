import { logger } from '../logger';

export interface CDNConfig {
    provider: 'cloudflare' | 'aws' | 'azure' | 'custom';
    baseUrl: string;
    apiKey?: string;
    zoneId?: string;
    distributionId?: string;
    customHeaders?: Record<string, string>;
}

export interface CacheControlOptions {
    maxAge?: number;
    sMaxAge?: number;
    public?: boolean;
    private?: boolean;
    noCache?: boolean;
    noStore?: boolean;
    mustRevalidate?: boolean;
    immutable?: boolean;
}

export interface PurgeOptions {
    urls?: string[];
    tags?: string[];
    everything?: boolean;
}

export class CDNManager {
    private config: CDNConfig;

    constructor(config: CDNConfig) {
        this.config = config;
    }

    generateAssetUrl(path: string, version?: string): string {
        let url = `${this.config.baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;

        if (version) {
            const separator = url.includes('?') ? '&' : '?';
            url += `${separator}v=${version}`;
        }

        return url;
    }

    generateCacheControlHeader(options: CacheControlOptions): string {
        const directives: string[] = [];

        if (options.public) directives.push('public');
        if (options.private) directives.push('private');
        if (options.noCache) directives.push('no-cache');
        if (options.noStore) directives.push('no-store');
        if (options.mustRevalidate) directives.push('must-revalidate');
        if (options.immutable) directives.push('immutable');

        if (options.maxAge !== undefined) {
            directives.push(`max-age=${options.maxAge}`);
        }

        if (options.sMaxAge !== undefined) {
            directives.push(`s-maxage=${options.sMaxAge}`);
        }

        return directives.join(', ');
    }

    async purgeCache(options: PurgeOptions): Promise<boolean> {
        try {
            switch (this.config.provider) {
                case 'cloudflare':
                    return await this.purgeCloudflare(options);
                case 'aws':
                    return await this.purgeAWS(options);
                case 'azure':
                    return await this.purgeAzure(options);
                default:
                    logger.warn(`Purge not implemented for provider: ${this.config.provider}`);
                    return false;
            }
        } catch (error) {
            logger.error('CDN purge failed:', error);
            return false;
        }
    }

    private async purgeCloudflare(options: PurgeOptions): Promise<boolean> {
        if (!this.config.apiKey || !this.config.zoneId) {
            throw new Error('Cloudflare API key and zone ID are required');
        }

        const purgeData: any = {};

        if (options.everything) {
            purgeData.purge_everything = true;
        } else if (options.urls) {
            purgeData.files = options.urls;
        } else if (options.tags) {
            purgeData.tags = options.tags;
        }

        const response = await fetch(
            `https://api.cloudflare.com/client/v4/zones/${this.config.zoneId}/purge_cache`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.config.apiKey}`,
                    'Content-Type': 'application/json',
                    ...this.config.customHeaders,
                },
                body: JSON.stringify(purgeData),
            }
        );

        const result = await response.json() as { success: boolean; errors?: any[] };

        if (result.success) {
            logger.info('Cloudflare cache purged successfully');
            return true;
        } else {
            logger.error('Cloudflare cache purge failed:', result.errors);
            return false;
        }
    }

    private async purgeAWS(options: PurgeOptions): Promise<boolean> {
        // AWS CloudFront invalidation would require AWS SDK
        // This is a placeholder implementation
        logger.info('AWS CloudFront purge requested', options);
        return true;
    }

    private async purgeAzure(options: PurgeOptions): Promise<boolean> {
        // Azure CDN purge would require Azure SDK
        // This is a placeholder implementation
        logger.info('Azure CDN purge requested', options);
        return true;
    }

    // Asset optimization helpers
    getOptimizedImageUrl(
        imagePath: string,
        options: {
            width?: number;
            height?: number;
            quality?: number;
            format?: 'webp' | 'avif' | 'jpeg' | 'png';
            fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
        } = {}
    ): string {
        const params = new URLSearchParams();

        if (options.width) params.set('w', options.width.toString());
        if (options.height) params.set('h', options.height.toString());
        if (options.quality) params.set('q', options.quality.toString());
        if (options.format) params.set('f', options.format);
        if (options.fit) params.set('fit', options.fit);

        const queryString = params.toString();
        const baseUrl = this.generateAssetUrl(imagePath);

        return queryString ? `${baseUrl}?${queryString}` : baseUrl;
    }

    // Preload hints for critical resources
    generatePreloadLinks(assets: Array<{
        url: string;
        type: 'script' | 'style' | 'font' | 'image';
        crossorigin?: boolean;
    }>): string[] {
        return assets.map(asset => {
            let link = `<${asset.url}>; rel=preload; as=${asset.type}`;

            if (asset.crossorigin) {
                link += '; crossorigin';
            }

            return link;
        });
    }

    // Cache warming
    async warmCache(urls: string[]): Promise<{ success: string[]; failed: string[] }> {
        const results = { success: [] as string[], failed: [] as string[] };

        const promises = urls.map(async (url) => {
            try {
                const response = await fetch(url, { method: 'HEAD' });

                if (response.ok) {
                    results.success.push(url);
                } else {
                    results.failed.push(url);
                }
            } catch (error) {
                logger.error(`Cache warming failed for ${url}:`, error);
                results.failed.push(url);
            }
        });

        await Promise.all(promises);

        logger.info(`Cache warming completed: ${results.success.length} success, ${results.failed.length} failed`);

        return results;
    }
}

// Static asset management
export class StaticAssetManager {
    private cdnManager: CDNManager;
    private assetManifest: Map<string, string> = new Map();

    constructor(cdnManager: CDNManager) {
        this.cdnManager = cdnManager;
    }

    loadManifest(manifest: Record<string, string>): void {
        this.assetManifest.clear();
        Object.entries(manifest).forEach(([key, value]) => {
            this.assetManifest.set(key, value);
        });
    }

    getAssetUrl(assetName: string): string {
        const hashedName = this.assetManifest.get(assetName) || assetName;
        return this.cdnManager.generateAssetUrl(hashedName);
    }

    getCriticalCSS(): string[] {
        const criticalAssets = Array.from(this.assetManifest.keys())
            .filter(key => key.includes('critical') && key.endsWith('.css'))
            .map(key => this.getAssetUrl(key));

        return criticalAssets;
    }

    getPreloadAssets(): Array<{ url: string; type: 'script' | 'style' | 'font' | 'image'; crossorigin?: boolean }> {
        const preloadAssets: Array<{ url: string; type: 'script' | 'style' | 'font' | 'image'; crossorigin?: boolean }> = [];

        // Add critical CSS
        this.getCriticalCSS().forEach(url => {
            preloadAssets.push({ url, type: 'style' });
        });

        // Add critical JavaScript
        Array.from(this.assetManifest.keys())
            .filter(key => key.includes('critical') && key.endsWith('.js'))
            .forEach(key => {
                preloadAssets.push({ url: this.getAssetUrl(key), type: 'script' });
            });

        // Add web fonts
        Array.from(this.assetManifest.keys())
            .filter(key => key.endsWith('.woff2') || key.endsWith('.woff'))
            .forEach(key => {
                preloadAssets.push({
                    url: this.getAssetUrl(key),
                    type: 'font',
                    crossorigin: true
                });
            });

        return preloadAssets;
    }
}

// Response optimization middleware
export class CDNOptimizationMiddleware {
    private cdnManager: CDNManager;
    private assetManager: StaticAssetManager;

    constructor(cdnManager: CDNManager, assetManager: StaticAssetManager) {
        this.cdnManager = cdnManager;
        this.assetManager = assetManager;
    }

    optimizeResponse() {
        return (req: any, res: any, next: any) => {
            // Add CDN headers for static assets
            if (this.isStaticAsset(req.path)) {
                const cacheControl = this.cdnManager.generateCacheControlHeader({
                    public: true,
                    maxAge: 31536000, // 1 year
                    immutable: true,
                });

                res.set('Cache-Control', cacheControl);
                res.set('CDN-Cache-Control', cacheControl);
            }

            // Add preload headers for HTML responses
            if (req.path === '/' || req.path.endsWith('.html')) {
                const preloadAssets = this.assetManager.getPreloadAssets();
                const preloadLinks = this.cdnManager.generatePreloadLinks(preloadAssets);

                if (preloadLinks.length > 0) {
                    res.set('Link', preloadLinks.join(', '));
                }
            }

            next();
        };
    }

    private isStaticAsset(path: string): boolean {
        const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.woff', '.woff2', '.ttf', '.eot'];
        return staticExtensions.some(ext => path.endsWith(ext));
    }
}