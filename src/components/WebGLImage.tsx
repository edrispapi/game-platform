'use client';
import { useEffect, useRef, useState } from 'react';
import { ImageIcon, AlertCircle } from 'lucide-react';

interface WebGLImageProps {
  src: string;
  alt: string;
  className?: string;
  fallback?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export function WebGLImage({ src, alt, className = '', fallback, onLoad, onError }: WebGLImageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [webglSupported, setWebglSupported] = useState(false);

  useEffect(() => {
    // Check WebGL support
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    if (!gl) {
      setWebglSupported(false);
      return;
    }

    setWebglSupported(true);
    const image = new Image();
    image.crossOrigin = 'anonymous';

    image.onload = () => {
      try {
        // Set canvas size
        canvas.width = image.width;
        canvas.height = image.height;

        // Create texture
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        // Create shader program
        const vertexShaderSource = `
          attribute vec2 a_position;
          attribute vec2 a_texCoord;
          varying vec2 v_texCoord;
          void main() {
            gl_Position = vec4(a_position, 0.0, 1.0);
            v_texCoord = a_texCoord;
          }
        `;

        const fragmentShaderSource = `
          precision mediump float;
          uniform sampler2D u_texture;
          varying vec2 v_texCoord;
          void main() {
            gl_FragColor = texture2D(u_texture, v_texCoord);
          }
        `;

        function createShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
          const shader = gl.createShader(type);
          if (!shader) return null;
          gl.shaderSource(shader, source);
          gl.compileShader(shader);
          if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Shader compile error:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
          }
          return shader;
        }

        function createProgram(gl: WebGLRenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram | null {
          const program = gl.createProgram();
          if (!program) return null;
          gl.attachShader(program, vertexShader);
          gl.attachShader(program, fragmentShader);
          gl.linkProgram(program);
          if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('Program link error:', gl.getProgramInfoLog(program));
            gl.deleteProgram(program);
            return null;
          }
          return program;
        }

        const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
        
        if (!vertexShader || !fragmentShader) {
          setError(true);
          setLoading(false);
          onError?.();
          return;
        }

        const program = createProgram(gl, vertexShader, fragmentShader);
        if (!program) {
          setError(true);
          setLoading(false);
          onError?.();
          return;
        }

        // Set up geometry
        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
          -1, -1,  1, -1,  -1, 1,
          -1, 1,   1, -1,   1, 1,
        ]), gl.STATIC_DRAW);

        const texCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
          0, 1,  1, 1,  0, 0,
          0, 0,  1, 1,  1, 0,
        ]), gl.STATIC_DRAW);

        // Use program
        gl.useProgram(program);

        // Set up attributes
        const positionLocation = gl.getAttribLocation(program, 'a_position');
        const texCoordLocation = gl.getAttribLocation(program, 'a_texCoord');

        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
        gl.enableVertexAttribArray(texCoordLocation);
        gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);

        // Set texture
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(gl.getUniformLocation(program, 'u_texture'), 0);

        // Clear and draw
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        setLoading(false);
        onLoad?.();
      } catch (err) {
        console.error('WebGL render error:', err);
        setError(true);
        setLoading(false);
        onError?.();
      }
    };

    image.onerror = () => {
      setError(true);
      setLoading(false);
      onError?.();
    };

    // Handle data URLs and regular URLs
    if (src.startsWith('data:')) {
      image.src = src;
    } else {
      // Try WebP first, fallback to original
      const webpSrc = src.replace(/\.(jpg|jpeg|png)$/i, '.webp');
      image.src = webpSrc;
      
      // If WebP fails, try original
      image.onerror = () => {
        const originalImage = new Image();
        originalImage.crossOrigin = 'anonymous';
        originalImage.onload = image.onload;
        originalImage.onerror = () => {
          setError(true);
          setLoading(false);
          onError?.();
        };
        originalImage.src = src;
      };
    }
  }, [src, onLoad, onError]);

  // Fallback to regular img if WebGL not supported or error
  if (!webglSupported || error) {
    return (
      <div className={`relative ${className}`}>
        {loading && (
          <div className="absolute inset-0 bg-void-700 animate-pulse flex items-center justify-center">
            <ImageIcon className="h-8 w-8 text-gray-600" />
          </div>
        )}
        <img
          src={error && fallback ? fallback : src}
          alt={alt}
          className={`${className} ${loading ? 'opacity-0' : 'opacity-100'} transition-opacity`}
          onLoad={() => {
            setLoading(false);
            onLoad?.();
          }}
          onError={() => {
            setError(true);
            setLoading(false);
            onError?.();
            if (fallback && src !== fallback) {
              // Try fallback
              const img = document.createElement('img');
              img.src = fallback;
            }
          }}
        />
        {error && !fallback && (
          <div className="absolute inset-0 flex items-center justify-center bg-void-700">
            <AlertCircle className="h-8 w-8 text-gray-600" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {loading && (
        <div className="absolute inset-0 bg-void-700 animate-pulse flex items-center justify-center">
          <ImageIcon className="h-8 w-8 text-gray-600" />
        </div>
      )}
      <canvas
        ref={canvasRef}
        className={`${className} ${loading ? 'opacity-0' : 'opacity-100'} transition-opacity`}
        style={{ maxWidth: '100%', height: 'auto' }}
      />
    </div>
  );
}

