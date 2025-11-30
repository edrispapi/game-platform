/**
 * Generate a unique banner image URL for workshop items based on their name/pack/post
 * Uses a deterministic hash to create consistent, unique images
 */
export function generateWorkshopBanner(title: string, type: string, id: string): string {
  // Create a hash from the title, type, and id
  const hash = simpleHash(title + type + id);
  
  // Use different image services based on hash to ensure variety
  const services = [
    'https://picsum.photos',
    'https://source.unsplash.com',
    'https://images.unsplash.com',
  ];
  
  const service = services[hash % services.length];
  
  // Generate different sizes and seeds based on hash
  const width = 800;
  const height = 450;
  const seed = hash % 1000000;
  
  if (service.includes('picsum')) {
    return `${service}/${width}/${height}?random=${seed}`;
  } else if (service.includes('unsplash')) {
    // Use different categories based on type
    const categories: Record<string, string> = {
      mod: 'technology,gaming',
      skin: 'art,design',
      map: 'landscape,architecture',
      tool: 'technology,code',
    };
    const category = categories[type] || 'gaming';
    return `${service}/featured/${width}x${height}/?${category}&sig=${seed}`;
  }
  
  // Fallback to placeholder
  return `https://via.placeholder.com/${width}x${height}/${hash.toString(16).slice(0, 6)}/ffffff?text=${encodeURIComponent(title.substring(0, 20))}`;
}

/**
 * Simple hash function to convert string to number
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

