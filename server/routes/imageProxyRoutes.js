const express = require('express');
const https = require('https');
const http = require('http');
const { URL } = require('url');

const router = express.Router();

/**
 * Image proxy endpoint to bypass CORS restrictions
 * Fetches images from external URLs and returns them as base64
 */
router.get('/proxy-image', async (req, res) => {
    try {
        const { url } = req.query;
        
        if (!url) {
            return res.status(400).json({ 
                success: false, 
                error: 'URL parameter is required' 
            });
        }

        console.log('🖼️ Proxying image request for:', url);

        // Validate URL
        let parsedUrl;
        try {
            parsedUrl = new URL(url);
        } catch (error) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid URL format' 
            });
        }

        // Only allow HTTP/HTTPS
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Only HTTP and HTTPS URLs are allowed' 
            });
        }

        // Choose appropriate module
        const httpModule = parsedUrl.protocol === 'https:' ? https : http;

        // Fetch the image
        const imageData = await new Promise((resolve, reject) => {
            const request = httpModule.get(url, {
                timeout: 10000, // 10 second timeout
                headers: {
                    'User-Agent': 'OVHI-PDF-Generator/1.0',
                    'Accept': 'image/*'
                }
            }, (response) => {
                // Check if response is successful
                if (response.statusCode !== 200) {
                    reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
                    return;
                }

                // Check content type
                const contentType = response.headers['content-type'];
                if (!contentType || !contentType.startsWith('image/')) {
                    reject(new Error(`Invalid content type: ${contentType}`));
                    return;
                }

                // Collect data chunks
                const chunks = [];
                response.on('data', chunk => chunks.push(chunk));
                response.on('end', () => {
                    const buffer = Buffer.concat(chunks);
                    
                    // Convert to base64
                    const base64 = buffer.toString('base64');
                    const mimeType = contentType;
                    const dataUrl = `data:${mimeType};base64,${base64}`;
                    
                    resolve({
                        base64: dataUrl,
                        format: mimeType.includes('png') ? 'PNG' : 'JPEG',
                        size: buffer.length,
                        contentType: mimeType
                    });
                });
            });

            request.on('error', reject);
            request.on('timeout', () => {
                request.destroy();
                reject(new Error('Request timeout'));
            });
        });

        console.log('✅ Image loaded successfully:', {
            format: imageData.format,
            size: `${Math.round(imageData.size / 1024)}KB`,
            contentType: imageData.contentType
        });

        // Return the base64 image data
        res.json({
            success: true,
            data: imageData
        });

    } catch (error) {
        console.error('❌ Image proxy error:', error.message);
        
        res.status(500).json({
            success: false,
            error: error.message,
            fallback: true // Indicates client should use fallback
        });
    }
});

module.exports = router;