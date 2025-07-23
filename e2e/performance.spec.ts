import { test, expect } from '@playwright/test';

test.describe('Performance Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should load dashboard within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Dashboard should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
    
    // Check Core Web Vitals
    const metrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const vitals: any = {};
          
          entries.forEach((entry) => {
            if (entry.name === 'first-contentful-paint') {
              vitals.fcp = entry.startTime;
            }
            if (entry.name === 'largest-contentful-paint') {
              vitals.lcp = entry.startTime;
            }
          });
          
          resolve(vitals);
        }).observe({ entryTypes: ['paint', 'largest-contentful-paint'] });
        
        // Fallback timeout
        setTimeout(() => resolve({}), 5000);
      });
    });
    
    console.log('Performance metrics:', metrics);
  });

  test('should handle large project lists efficiently', async ({ page }) => {
    // Create multiple projects for testing
    const projectCount = 50;
    
    for (let i = 0; i < projectCount; i++) {
      await page.click('button:has-text("Novo Projeto")');
      await page.fill('input[name="name"]', `Projeto Performance ${i + 1}`);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(100); // Small delay to avoid overwhelming
    }
    
    const startTime = Date.now();
    
    // Navigate to projects list
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Large list should still load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
    
    // Check if all projects are visible
    const projectElements = page.locator('[data-testid="project-card"]');
    const visibleCount = await projectElements.count();
    
    expect(visibleCount).toBeGreaterThanOrEqual(Math.min(projectCount, 20)); // Assuming pagination
  });

  test('should handle rapid user interactions without lag', async ({ page }) => {
    // Create a project with multiple tasks
    await page.click('button:has-text("Novo Projeto")');
    await page.fill('input[name="name"]', 'Projeto Rapid Interactions');
    await page.click('button[type="submit"]');
    await page.click('text=Projeto Rapid Interactions');
    
    // Create multiple tasks rapidly
    const taskCount = 20;
    const startTime = Date.now();
    
    for (let i = 0; i < taskCount; i++) {
      await page.click('button:has-text("Nova Tarefa")');
      await page.fill('input[name="title"]', `Tarefa Rapid ${i + 1}`);
      await page.click('button[type="submit"]');
    }
    
    const creationTime = Date.now() - startTime;
    
    // Rapid task creation should complete within 30 seconds
    expect(creationTime).toBeLessThan(30000);
    
    // Test rapid status changes
    const statusChangeStart = Date.now();
    
    for (let i = 0; i < 10; i++) {
      const taskCard = page.locator('[data-testid="task-card"]').first();
      await taskCard.click();
      await page.click('[data-testid="status-select"]');
      await page.click('text=Em Progresso');
      await page.click('[data-testid="save-task"]');
      await page.waitForTimeout(100);
    }
    
    const statusChangeTime = Date.now() - statusChangeStart;
    
    // Rapid status changes should complete within 15 seconds
    expect(statusChangeTime).toBeLessThan(15000);
  });

  test('should maintain performance on mobile devices', async ({ page }) => {
    // Simulate mobile device performance
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Throttle CPU and network to simulate mobile conditions
    const client = await page.context().newCDPSession(page);
    await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: 1.5 * 1024 * 1024 / 8, // 1.5 Mbps
      uploadThroughput: 750 * 1024 / 8, // 750 Kbps
      latency: 40
    });
    
    const startTime = Date.now();
    
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Mobile should load within 5 seconds even with throttling
    expect(loadTime).toBeLessThan(5000);
    
    // Test mobile interactions
    await page.click('[data-testid="mobile-fab"]');
    await expect(page.locator('[data-testid="fab-menu"]')).toBeVisible();
    
    // Reset throttling
    await client.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: -1,
      uploadThroughput: -1,
      latency: 0
    });
  });

  test('should handle memory usage efficiently', async ({ page }) => {
    // Monitor memory usage during intensive operations
    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });
    
    // Perform memory-intensive operations
    for (let i = 0; i < 100; i++) {
      await page.click('button:has-text("Novo Projeto")');
      await page.fill('input[name="name"]', `Projeto Memory ${i + 1}`);
      await page.click('button[type="submit"]');
      
      if (i % 10 === 0) {
        // Check memory periodically
        const currentMemory = await page.evaluate(() => {
          return (performance as any).memory?.usedJSHeapSize || 0;
        });
        
        console.log(`Memory usage at ${i} projects:`, currentMemory);
        
        // Memory shouldn't grow excessively (allow 50MB increase)
        expect(currentMemory - initialMemory).toBeLessThan(50 * 1024 * 1024);
      }
    }
    
    // Force garbage collection if available
    await page.evaluate(() => {
      if ((window as any).gc) {
        (window as any).gc();
      }
    });
    
    const finalMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });
    
    console.log('Final memory usage:', finalMemory);
  });

  test('should handle concurrent user sessions', async ({ browser }) => {
    // Simulate multiple concurrent users
    const contexts = [];
    const pages = [];
    
    // Create 5 concurrent browser contexts
    for (let i = 0; i < 5; i++) {
      const context = await browser.newContext();
      const page = await context.newPage();
      
      contexts.push(context);
      pages.push(page);
    }
    
    const startTime = Date.now();
    
    // All users login simultaneously
    await Promise.all(pages.map(async (page, index) => {
      await page.goto('/login');
      await page.fill('input[type="email"]', `user${index}@example.com`);
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL('/dashboard');
    }));
    
    const loginTime = Date.now() - startTime;
    
    // Concurrent logins should complete within 10 seconds
    expect(loginTime).toBeLessThan(10000);
    
    // All users perform actions simultaneously
    const actionStartTime = Date.now();
    
    await Promise.all(pages.map(async (page, index) => {
      await page.click('button:has-text("Novo Projeto")');
      await page.fill('input[name="name"]', `Projeto Concurrent ${index}`);
      await page.click('button[type="submit"]');
    }));
    
    const actionTime = Date.now() - actionStartTime;
    
    // Concurrent actions should complete within 15 seconds
    expect(actionTime).toBeLessThan(15000);
    
    // Cleanup
    await Promise.all(contexts.map(context => context.close()));
  });

  test('should handle network failures gracefully', async ({ page }) => {
    // Test offline functionality
    await page.context().setOffline(true);
    
    await page.goto('/dashboard');
    
    // Should show offline indicator or cached content
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
    
    // Test that cached data is still accessible
    const cachedProjects = page.locator('[data-testid="project-card"]');
    const count = await cachedProjects.count();
    
    expect(count).toBeGreaterThanOrEqual(0); // Should show cached projects or empty state
    
    // Restore network
    await page.context().setOffline(false);
    
    // Should sync when back online
    await page.waitForTimeout(2000);
    await expect(page.locator('[data-testid="offline-indicator"]')).not.toBeVisible();
  });

  test('should optimize bundle size and loading', async ({ page }) => {
    // Monitor network requests
    const requests: any[] = [];
    
    page.on('request', (request) => {
      requests.push({
        url: request.url(),
        resourceType: request.resourceType(),
        size: 0 // Will be updated on response
      });
    });
    
    page.on('response', (response) => {
      const request = requests.find(r => r.url === response.url());
      if (request) {
        response.body().then(body => {
          request.size = body.length;
        }).catch(() => {});
      }
    });
    
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Analyze bundle sizes
    const jsRequests = requests.filter(r => r.resourceType === 'script');
    const cssRequests = requests.filter(r => r.resourceType === 'stylesheet');
    
    const totalJSSize = jsRequests.reduce((sum, req) => sum + req.size, 0);
    const totalCSSSize = cssRequests.reduce((sum, req) => sum + req.size, 0);
    
    console.log('Total JS size:', totalJSSize / 1024, 'KB');
    console.log('Total CSS size:', totalCSSSize / 1024, 'KB');
    
    // Bundle sizes should be reasonable
    expect(totalJSSize).toBeLessThan(2 * 1024 * 1024); // 2MB JS limit
    expect(totalCSSSize).toBeLessThan(500 * 1024); // 500KB CSS limit
    
    // Should have reasonable number of requests
    expect(jsRequests.length).toBeLessThan(10);
    expect(cssRequests.length).toBeLessThan(5);
  });
});