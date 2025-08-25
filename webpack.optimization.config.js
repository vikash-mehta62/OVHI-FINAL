/**
 * Webpack Optimization Configuration
 * Enhanced code splitting and bundle optimization for RCM module
 */

const path = require('path');

module.exports = {
  optimization: {
    // Enable code splitting
    splitChunks: {
      chunks: 'all',
      minSize: 20000,
      maxSize: 244000,
      cacheGroups: {
        // Vendor libraries
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
          priority: 10,
          reuseExistingChunk: true
        },
        
        // React and related libraries
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom|react-router)[\\/]/,
          name: 'react',
          chunks: 'all',
          priority: 20,
          reuseExistingChunk: true
        },
        
        // Chart libraries
        charts: {
          test: /[\\/]node_modules[\\/](recharts|d3|chart\.js)[\\/]/,
          name: 'charts',
          chunks: 'all',
          priority: 15,
          reuseExistingChunk: true
        },
        
        // UI libraries
        ui: {
          test: /[\\/]node_modules[\\/](@radix-ui|lucide-react|tailwindcss)[\\/]/,
          name: 'ui',
          chunks: 'all',
          priority: 15,
          reuseExistingChunk: true
        },
        
        // RCM Dashboard chunk
        rcmDashboard: {
          test: /[\\/]src[\\/]components[\\/]rcm[\\/](RCMDashboard|dashboard)[\\/]/,
          name: 'rcm-dashboard',
          chunks: 'all',
          priority: 30,
          minChunks: 1,
          reuseExistingChunk: true
        },
        
        // RCM Charts chunk
        rcmCharts: {
          test: /[\\/]src[\\/]components[\\/]rcm[\\/]dashboard[\\/]charts[\\/]/,
          name: 'rcm-charts',
          chunks: 'all',
          priority: 25,
          minChunks: 1,
          reuseExistingChunk: true
        },
        
        // RCM Management components
        rcmManagement: {
          test: /[\\/]src[\\/]components[\\/]rcm[\\/](Claims|ARAging|Collections|Payment|Denial)Management[\\/]/,
          name: 'rcm-management',
          chunks: 'all',
          priority: 25,
          minChunks: 1,
          reuseExistingChunk: true
        },
        
        // RCM Shared components
        rcmShared: {
          test: /[\\/]src[\\/]components[\\/]rcm[\\/]shared[\\/]/,
          name: 'rcm-shared',
          chunks: 'all',
          priority: 20,
          minChunks: 2,
          reuseExistingChunk: true
        },
        
        // Common utilities
        utils: {
          test: /[\\/]src[\\/](utils|hooks)[\\/]/,
          name: 'utils',
          chunks: 'all',
          priority: 15,
          minChunks: 2,
          reuseExistingChunk: true
        },
        
        // Default chunk for remaining code
        default: {
          minChunks: 2,
          priority: -20,
          reuseExistingChunk: true
        }
      }
    },
    
    // Runtime chunk optimization
    runtimeChunk: {
      name: 'runtime'
    },
    
    // Module concatenation (scope hoisting)
    concatenateModules: true,
    
    // Tree shaking optimization
    usedExports: true,
    sideEffects: false,
    
    // Minimize configuration
    minimize: process.env.NODE_ENV === 'production',
    minimizer: [
      // TerserPlugin configuration would go here
      // new TerserPlugin({
      //   terserOptions: {
      //     compress: {
      //       drop_console: process.env.NODE_ENV === 'production',
      //       drop_debugger: true,
      //       pure_funcs: ['console.log', 'console.info']
      //     },
      //     mangle: {
      //       safari10: true
      //     }
      //   }
      // })
    ]
  },
  
  // Performance hints
  performance: {
    hints: process.env.NODE_ENV === 'production' ? 'warning' : false,
    maxEntrypointSize: 250000,
    maxAssetSize: 250000,
    assetFilter: (assetFilename) => {
      return assetFilename.endsWith('.js');
    }
  },
  
  // Resolve configuration for better tree shaking
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@/components': path.resolve(__dirname, 'src/components'),
      '@/utils': path.resolve(__dirname, 'src/utils'),
      '@/hooks': path.resolve(__dirname, 'src/hooks')
    },
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    mainFields: ['browser', 'module', 'main']
  },
  
  // Module rules for optimization
  module: {
    rules: [
      // TypeScript/JavaScript optimization
      {
        test: /\.(ts|tsx|js|jsx)$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: [
                ['@babel/preset-env', {
                  modules: false, // Enable tree shaking
                  useBuiltIns: 'usage',
                  corejs: 3
                }],
                '@babel/preset-react',
                '@babel/preset-typescript'
              ],
              plugins: [
                // Dynamic import support
                '@babel/plugin-syntax-dynamic-import',
                // React optimization
                ['@babel/plugin-transform-react-jsx', {
                  runtime: 'automatic'
                }],
                // Remove development code in production
                process.env.NODE_ENV === 'production' && [
                  'babel-plugin-transform-remove-console',
                  { exclude: ['error', 'warn'] }
                ]
              ].filter(Boolean)
            }
          }
        ]
      },
      
      // CSS optimization
      {
        test: /\.css$/,
        use: [
          process.env.NODE_ENV === 'production' ? 'mini-css-extract-plugin' : 'style-loader',
          'css-loader',
          'postcss-loader'
        ]
      }
    ]
  }
};

// Bundle analysis configuration
const bundleAnalysisConfig = {
  plugins: [
    // Bundle analyzer plugin (uncomment to use)
    // new (require('webpack-bundle-analyzer').BundleAnalyzerPlugin)({
    //   analyzerMode: 'static',
    //   openAnalyzer: false,
    //   reportFilename: 'bundle-report.html'
    // })
  ]
};

// Export configurations
module.exports.bundleAnalysisConfig = bundleAnalysisConfig;

// Vite configuration equivalent
module.exports.viteConfig = {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', 'lucide-react'],
          'vendor-charts': ['recharts'],
          
          // RCM chunks
          'rcm-dashboard': [
            './src/components/rcm/RCMDashboard.tsx',
            './src/components/rcm/dashboard/KPICards.tsx',
            './src/components/rcm/dashboard/ChartsSection.tsx'
          ],
          'rcm-charts': [
            './src/components/rcm/dashboard/charts/RevenueChart.tsx',
            './src/components/rcm/dashboard/charts/ClaimsStatusChart.tsx',
            './src/components/rcm/dashboard/charts/PaymentSummaryChart.tsx'
          ],
          'rcm-management': [
            './src/components/rcm/ClaimsManagement.tsx',
            './src/components/rcm/ARAgingManagement.tsx',
            './src/components/rcm/CollectionsManagement.tsx'
          ],
          'rcm-shared': [
            './src/components/rcm/shared/DataTable.tsx',
            './src/components/rcm/shared/VirtualizedTable.tsx',
            './src/components/rcm/shared/KPICard.tsx'
          ]
        }
      }
    },
    chunkSizeWarningLimit: 500,
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: true
      }
    }
  },
  
  // Development optimizations
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'recharts',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      'lucide-react'
    ]
  }
};