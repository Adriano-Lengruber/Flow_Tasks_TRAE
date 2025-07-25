import React, { useState, useRef, useEffect, useCallback } from 'react';

// Interface para props do OptimizedImage
interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number | string;
  height?: number | string;
  className?: string;
  style?: React.CSSProperties;
  placeholder?: string;
  blurDataURL?: string;
  quality?: number;
  priority?: boolean;
  loading?: 'lazy' | 'eager';
  onLoad?: () => void;
  onError?: () => void;
  sizes?: string;
  srcSet?: string;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  fallback?: string;
}

// Interface para configuração de otimização
interface ImageOptimizationConfig {
  enableWebP: boolean;
  enableLazyLoading: boolean;
  enableBlurPlaceholder: boolean;
  defaultQuality: number;
  breakpoints: number[];
}

// Configuração padrão
const defaultConfig: ImageOptimizationConfig = {
  enableWebP: true,
  enableLazyLoading: true,
  enableBlurPlaceholder: true,
  defaultQuality: 80,
  breakpoints: [640, 768, 1024, 1280, 1536]
};

// Hook para detecção de suporte WebP
export const useWebPSupport = () => {
  const [supportsWebP, setSupportsWebP] = useState<boolean | null>(null);
  
  useEffect(() => {
    const checkWebPSupport = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const dataURL = canvas.toDataURL('image/webp');
      setSupportsWebP(dataURL.indexOf('data:image/webp') === 0);
    };
    
    checkWebPSupport();
  }, []);
  
  return supportsWebP;
};

// Hook para Intersection Observer (lazy loading)
export const useIntersectionObserver = ({
  threshold = 0.1,
  rootMargin = '50px'
}: {
  threshold?: number;
  rootMargin?: string;
} = {}) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);
  const ref = useRef<HTMLElement>(null);
  
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
        if (entry.isIntersecting && !hasIntersected) {
          setHasIntersected(true);
        }
      },
      { threshold, rootMargin }
    );
    
    observer.observe(element);
    
    return () => {
      observer.unobserve(element);
    };
  }, [threshold, rootMargin, hasIntersected]);
  
  return { ref, isIntersecting, hasIntersected };
};

// Função para gerar srcSet responsivo
const generateSrcSet = (src: string, breakpoints: number[], quality: number = 80): string => {
  return breakpoints
    .map(width => {
      const optimizedSrc = optimizeImageUrl(src, { width, quality });
      return `${optimizedSrc} ${width}w`;
    })
    .join(', ');
};

// Função para otimizar URL da imagem
const optimizeImageUrl = (src: string, options: {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
} = {}): string => {
  // Se for uma URL externa ou já otimizada, retorna como está
  if (src.startsWith('http') || src.includes('?')) {
    return src;
  }
  
  const params = new URLSearchParams();
  
  if (options.width) params.set('w', options.width.toString());
  if (options.height) params.set('h', options.height.toString());
  if (options.quality) params.set('q', options.quality.toString());
  if (options.format) params.set('f', options.format);
  
  const queryString = params.toString();
  return queryString ? `${src}?${queryString}` : src;
};

// Função para gerar placeholder blur
const generateBlurDataURL = (width: number = 10, height: number = 10): string => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  
  // Criar gradiente simples
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#f0f0f0');
  gradient.addColorStop(1, '#e0e0e0');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  return canvas.toDataURL('image/jpeg', 0.1);
};

// Componente principal OptimizedImage
export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  className = '',
  style = {},
  placeholder,
  blurDataURL,
  quality = defaultConfig.defaultQuality,
  priority = false,
  loading = 'lazy',
  onLoad,
  onError,
  sizes,
  srcSet,
  objectFit = 'cover',
  fallback
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string>('');
  
  const supportsWebP = useWebPSupport();
  const { ref, hasIntersected } = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: '50px'
  });
  
  // Determinar se deve carregar a imagem
  const shouldLoad = priority || loading === 'eager' || hasIntersected;
  
  // Gerar URLs otimizadas
  const optimizedSrc = useCallback(() => {
    if (!shouldLoad) return '';
    
    const format = supportsWebP ? 'webp' : undefined;
    return optimizeImageUrl(src, {
      width: typeof width === 'number' ? width : undefined,
      height: typeof height === 'number' ? height : undefined,
      quality,
      format
    });
  }, [src, width, height, quality, supportsWebP, shouldLoad]);
  
  // Gerar srcSet responsivo
  const responsiveSrcSet = useCallback(() => {
    if (!shouldLoad || srcSet) return srcSet;
    
    return generateSrcSet(src, defaultConfig.breakpoints, quality);
  }, [src, quality, shouldLoad, srcSet]);
  
  // Atualizar src quando necessário
  useEffect(() => {
    if (shouldLoad && !currentSrc) {
      setCurrentSrc(optimizedSrc());
    }
  }, [shouldLoad, currentSrc, optimizedSrc]);
  
  // Handlers de eventos
  const handleLoad = useCallback(() => {
    setImageLoaded(true);
    onLoad?.();
  }, [onLoad]);
  
  const handleError = useCallback(() => {
    setImageError(true);
    if (fallback) {
      setCurrentSrc(fallback);
    }
    onError?.();
  }, [onError, fallback]);
  
  // Gerar placeholder
  const placeholderSrc = placeholder || blurDataURL || generateBlurDataURL();
  
  // Estilos do container
  const containerStyle: React.CSSProperties = {
    position: 'relative',
    overflow: 'hidden',
    width,
    height,
    ...style
  };
  
  // Estilos da imagem
  const imageStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit,
    transition: 'opacity 0.3s ease-in-out',
    opacity: imageLoaded ? 1 : 0
  };
  
  // Estilos do placeholder
  const placeholderStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit,
    filter: 'blur(10px)',
    transform: 'scale(1.1)',
    opacity: imageLoaded ? 0 : 1,
    transition: 'opacity 0.3s ease-in-out'
  };
  
  return (
    <div 
      ref={ref as React.RefObject<HTMLDivElement>}
      className={`optimized-image-container ${className}`}
      style={containerStyle}
    >
      {/* Placeholder/Blur */}
      {defaultConfig.enableBlurPlaceholder && (
        <img
          src={placeholderSrc}
          alt=""
          style={placeholderStyle}
          aria-hidden="true"
        />
      )}
      
      {/* Imagem principal */}
      {shouldLoad && currentSrc && (
        <img
          src={currentSrc}
          srcSet={responsiveSrcSet()}
          sizes={sizes}
          alt={alt}
          style={imageStyle}
          onLoad={handleLoad}
          onError={handleError}
          loading={priority ? 'eager' : 'lazy'}
        />
      )}
      
      {/* Fallback para erro */}
      {imageError && !fallback && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f5f5f5',
            color: '#999',
            fontSize: '14px'
          }}
        >
          Imagem não disponível
        </div>
      )}
    </div>
  );
};

// Componente para galeria de imagens otimizada
interface OptimizedImageGalleryProps {
  images: Array<{
    src: string;
    alt: string;
    caption?: string;
  }>;
  columns?: number;
  gap?: number;
  onImageClick?: (index: number) => void;
  className?: string;
}

export const OptimizedImageGallery: React.FC<OptimizedImageGalleryProps> = ({
  images,
  columns = 3,
  gap = 16,
  onImageClick,
  className = ''
}) => {
  const galleryStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${columns}, 1fr)`,
    gap: `${gap}px`,
    width: '100%'
  };
  
  return (
    <div className={`optimized-image-gallery ${className}`} style={galleryStyle}>
      {images.map((image, index) => (
        <div
          key={index}
          className="gallery-item"
          onClick={() => onImageClick?.(index)}
          style={{ cursor: onImageClick ? 'pointer' : 'default' }}
        >
          <OptimizedImage
            src={image.src}
            alt={image.alt}
            width="100%"
            height={200}
            objectFit="cover"
            style={{ borderRadius: '8px' }}
          />
          {image.caption && (
            <p style={{ 
              margin: '8px 0 0 0', 
              fontSize: '14px', 
              color: '#666',
              textAlign: 'center'
            }}>
              {image.caption}
            </p>
          )}
        </div>
      ))}
    </div>
  );
};

// Hook para preload de imagens
export const useImagePreload = (urls: string[]) => {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  
  useEffect(() => {
    const preloadImage = (url: string) => {
      return new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          setLoadedImages(prev => new Set(prev).add(url));
          resolve();
        };
        img.onerror = reject;
        img.src = url;
      });
    };
    
    urls.forEach(url => {
      if (!loadedImages.has(url)) {
        preloadImage(url).catch(console.error);
      }
    });
  }, [urls, loadedImages]);
  
  return loadedImages;
};

export default OptimizedImage;