import { test, expect } from '@playwright/test';

test.describe('Mobile Responsiveness', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should display mobile navigation on small screens', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check if mobile navigation is visible
    await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible();
    await expect(page.locator('[data-testid="desktop-nav"]')).not.toBeVisible();
  });

  test('should display desktop navigation on large screens', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // Check if desktop navigation is visible
    await expect(page.locator('[data-testid="desktop-nav"]')).toBeVisible();
    await expect(page.locator('[data-testid="mobile-nav"]')).not.toBeVisible();
  });

  test('should show mobile-optimized FAB on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Navigate to project details
    await page.click('button:has-text("Novo Projeto")');
    await page.fill('input[name="name"]', 'Projeto Mobile Test');
    await page.click('button[type="submit"]');
    await page.click('text=Projeto Mobile Test');
    
    // Check if mobile FAB is visible
    await expect(page.locator('[data-testid="mobile-fab"]')).toBeVisible();
    
    // Test FAB functionality
    await page.click('[data-testid="mobile-fab"]');
    await expect(page.locator('[data-testid="fab-menu"]')).toBeVisible();
  });

  test('should support touch gestures on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Create a project and task for testing
    await page.click('button:has-text("Novo Projeto")');
    await page.fill('input[name="name"]', 'Projeto Touch Test');
    await page.click('button[type="submit"]');
    await page.click('text=Projeto Touch Test');
    
    await page.click('button:has-text("Nova Tarefa")');
    await page.fill('input[name="title"]', 'Tarefa Touch');
    await page.click('button[type="submit"]');
    
    // Test swipe gesture on task card
    const taskCard = page.locator('[data-testid="task-card"]:has-text("Tarefa Touch")');
    
    // Simulate swipe left to reveal actions
    await taskCard.hover();
    await page.mouse.down();
    await page.mouse.move(-100, 0);
    await page.mouse.up();
    
    // Check if swipe actions are visible
    await expect(page.locator('[data-testid="swipe-actions"]')).toBeVisible();
  });

  test('should display mobile-optimized modals', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Open task creation modal
    await page.click('button:has-text("Novo Projeto")');
    
    // Check if modal is full-screen on mobile
    const modal = page.locator('[data-testid="mobile-modal"]');
    await expect(modal).toBeVisible();
    await expect(modal).toHaveCSS('width', '100%');
    await expect(modal).toHaveCSS('height', '100%');
  });

  test('should show mobile-optimized tooltips with long press', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Find an element with tooltip
    const tooltipTrigger = page.locator('[data-testid="tooltip-trigger"]');
    
    // Simulate long press (touch and hold)
    await tooltipTrigger.hover();
    await page.mouse.down();
    await page.waitForTimeout(800); // Long press duration
    
    // Check if tooltip is visible
    await expect(page.locator('[data-testid="mobile-tooltip"]')).toBeVisible();
    
    await page.mouse.up();
  });

  test('should support pull-to-refresh on mobile lists', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Navigate to projects list
    const projectsList = page.locator('[data-testid="projects-list"]');
    
    // Simulate pull-to-refresh gesture
    await projectsList.hover();
    await page.mouse.down();
    await page.mouse.move(0, 100); // Pull down
    await page.waitForTimeout(500);
    await page.mouse.up();
    
    // Check if refresh indicator appears
    await expect(page.locator('[data-testid="pull-refresh-indicator"]')).toBeVisible();
  });

  test('should display mobile-optimized tables as cards', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Navigate to a page with tables (e.g., tasks list)
    await page.click('button:has-text("Novo Projeto")');
    await page.fill('input[name="name"]', 'Projeto Table Test');
    await page.click('button[type="submit"]');
    await page.click('text=Projeto Table Test');
    
    // Switch to table view
    await page.click('[data-testid="view-toggle-table"]');
    
    // Check if table is displayed as cards on mobile
    await expect(page.locator('[data-testid="mobile-card-view"]')).toBeVisible();
    await expect(page.locator('[data-testid="desktop-table-view"]')).not.toBeVisible();
  });

  test('should show mobile bottom sheet for actions', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Create a task to interact with
    await page.click('button:has-text("Novo Projeto")');
    await page.fill('input[name="name"]', 'Projeto Bottom Sheet');
    await page.click('button[type="submit"]');
    await page.click('text=Projeto Bottom Sheet');
    
    await page.click('button:has-text("Nova Tarefa")');
    await page.fill('input[name="title"]', 'Tarefa Bottom Sheet');
    await page.click('button[type="submit"]');
    
    // Open task menu
    await page.click('[data-testid="task-menu"]');
    
    // Check if bottom sheet appears
    await expect(page.locator('[data-testid="mobile-bottom-sheet"]')).toBeVisible();
    
    // Test bottom sheet swipe to dismiss
    const bottomSheet = page.locator('[data-testid="mobile-bottom-sheet"]');
    await bottomSheet.hover();
    await page.mouse.down();
    await page.mouse.move(0, 200); // Swipe down
    await page.mouse.up();
    
    // Bottom sheet should be dismissed
    await expect(bottomSheet).not.toBeVisible();
  });

  test('should provide haptic feedback on mobile interactions', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Test haptic feedback on button press
    const button = page.locator('[data-testid="haptic-button"]');
    
    // Mock haptic feedback API
    await page.addInitScript(() => {
      (window as any).navigator.vibrate = (pattern: number | number[]) => {
        console.log('Haptic feedback triggered:', pattern);
        return true;
      };
    });
    
    // Click button and check if haptic feedback was triggered
    await button.click();
    
    // Check console for haptic feedback log
    const logs = await page.evaluate(() => {
      return (window as any).hapticLogs || [];
    });
    
    expect(logs.length).toBeGreaterThan(0);
  });

  test('should adapt layout for tablet screens', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    
    // Check if tablet-specific layout is applied
    await expect(page.locator('[data-testid="tablet-layout"]')).toBeVisible();
    
    // Verify that both mobile and desktop elements are appropriately shown/hidden
    await expect(page.locator('[data-testid="mobile-nav"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="desktop-nav"]')).toBeVisible();
    
    // Check if FAB is still visible on tablet
    await expect(page.locator('[data-testid="mobile-fab"]')).toBeVisible();
  });

  test('should maintain touch target sizes (44px minimum)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check touch targets meet minimum size requirements
    const touchTargets = page.locator('[data-testid*="touch-target"]');
    const count = await touchTargets.count();
    
    for (let i = 0; i < count; i++) {
      const element = touchTargets.nth(i);
      const box = await element.boundingBox();
      
      if (box) {
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }
  });
});