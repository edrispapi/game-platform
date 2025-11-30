'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { WebGLImage } from '@/components/WebGLImage';
import { Check, X, AlertCircle } from 'lucide-react';

export function WebGLTestPage() {
  const [webglSupported, setWebglSupported] = useState<boolean | null>(null);
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Check WebGL support
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    setWebglSupported(!!gl);

    // Test images
    const testImages = [
      'https://cdn.mobygames.com/screenshots/120/656607-the-witcher-3-wild-hunt-windows.jpg',
      'https://cdn.mobygames.com/screenshots/18227866-elden-ring-windows-a-lot-of-great-views-to-take-in.jpg',
      'https://cdn.mobygames.com/screenshots/192/997001-baldurs-gate-3-windows.jpg',
    ];

    testImages.forEach((url, index) => {
      const img = new Image();
      img.onload = () => {
        setTestResults(prev => ({ ...prev, [`image-${index}`]: true }));
      };
      img.onerror = () => {
        setTestResults(prev => ({ ...prev, [`image-${index}`]: false }));
      };
      img.src = url;
    });
  }, []);

  return (
    <div className="animate-fade-in space-y-6 p-6">
      <div>
        <h1 className="font-orbitron text-4xl font-black text-blood-500 mb-2">WebGL Image Test</h1>
        <p className="text-gray-400">Testing WebGL image rendering across the platform</p>
      </div>

      {/* WebGL Support Check */}
      <Card className="bg-void-800 border-void-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {webglSupported === null ? (
              <AlertCircle className="h-5 w-5 text-yellow-500" />
            ) : webglSupported ? (
              <Check className="h-5 w-5 text-green-500" />
            ) : (
              <X className="h-5 w-5 text-red-500" />
            )}
            WebGL Support
          </CardTitle>
        </CardHeader>
        <CardContent>
          {webglSupported === null ? (
            <p className="text-gray-400">Checking...</p>
          ) : webglSupported ? (
            <div className="space-y-2">
              <Badge className="bg-green-500">WebGL Supported</Badge>
              <p className="text-sm text-gray-400 mt-2">
                Your browser supports WebGL. Images will be rendered using WebGL acceleration.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Badge className="bg-yellow-500">WebGL Not Supported</Badge>
              <p className="text-sm text-gray-400 mt-2">
                Your browser does not support WebGL. Images will fall back to standard img tags.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Images */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="bg-void-800 border-void-700">
          <CardHeader>
            <CardTitle className="text-lg">Test Image 1</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="aspect-video relative">
              <WebGLImage
                src="https://cdn.mobygames.com/screenshots/120/656607-the-witcher-3-wild-hunt-windows.jpg"
                alt="Test Image 1"
                className="w-full h-full object-cover rounded-lg"
                fallback="/images/default-workshop.svg"
              />
            </div>
            <div className="mt-2">
              {testResults['image-0'] !== undefined && (
                <Badge variant={testResults['image-0'] ? 'default' : 'destructive'}>
                  {testResults['image-0'] ? 'Loaded' : 'Failed'}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-void-800 border-void-700">
          <CardHeader>
            <CardTitle className="text-lg">Test Image 2</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="aspect-video relative">
              <WebGLImage
                src="https://cdn.mobygames.com/screenshots/18227866-elden-ring-windows-a-lot-of-great-views-to-take-in.jpg"
                alt="Test Image 2"
                className="w-full h-full object-cover rounded-lg"
                fallback="/images/default-workshop.svg"
              />
            </div>
            <div className="mt-2">
              {testResults['image-1'] !== undefined && (
                <Badge variant={testResults['image-1'] ? 'default' : 'destructive'}>
                  {testResults['image-1'] ? 'Loaded' : 'Failed'}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-void-800 border-void-700">
          <CardHeader>
            <CardTitle className="text-lg">Test Image 3</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="aspect-video relative">
              <WebGLImage
                src="https://cdn.mobygames.com/screenshots/192/997001-baldurs-gate-3-windows.jpg"
                alt="Test Image 3"
                className="w-full h-full object-cover rounded-lg"
                fallback="/images/default-workshop.svg"
              />
            </div>
            <div className="mt-2">
              {testResults['image-2'] !== undefined && (
                <Badge variant={testResults['image-2'] ? 'default' : 'destructive'}>
                  {testResults['image-2'] ? 'Loaded' : 'Failed'}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary */}
      <Card className="bg-void-800 border-void-700">
        <CardHeader>
          <CardTitle>Test Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between">
            <span>WebGL Support:</span>
            <Badge variant={webglSupported ? 'default' : 'destructive'}>
              {webglSupported ? 'Yes' : 'No'}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>Images Tested:</span>
            <span>{Object.keys(testResults).length} / 3</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Successful Loads:</span>
            <span>
              {Object.values(testResults).filter(Boolean).length} / {Object.keys(testResults).length}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

