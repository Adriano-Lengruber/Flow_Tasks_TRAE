import { test, expect } from '@playwright/test';

test.describe('Projects Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should display projects dashboard', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Dashboard');
    await expect(page.locator('[data-testid="projects-grid"]')).toBeVisible();
    await expect(page.locator('button:has-text("Novo Projeto")')).toBeVisible();
  });

  test('should create new project', async ({ page }) => {
    await page.click('button:has-text("Novo Projeto")');
    
    // Fill project form
    await page.fill('input[name="name"]', 'Projeto E2E Test');
    await page.fill('textarea[name="description"]', 'Projeto criado durante teste E2E');
    await page.selectOption('select[name="status"]', 'ACTIVE');
    
    await page.click('button[type="submit"]');
    
    // Verify project was created
    await expect(page.locator('text=Projeto criado com sucesso')).toBeVisible();
    await expect(page.locator('text=Projeto E2E Test')).toBeVisible();
  });

  test('should edit existing project', async ({ page }) => {
    // First create a project
    await page.click('button:has-text("Novo Projeto")');
    await page.fill('input[name="name"]', 'Projeto para Editar');
    await page.fill('textarea[name="description"]', 'Descrição original');
    await page.click('button[type="submit"]');
    
    // Edit the project
    await page.click('[data-testid="project-menu"]');
    await page.click('text=Editar');
    
    await page.fill('input[name="name"]', 'Projeto Editado');
    await page.fill('textarea[name="description"]', 'Descrição atualizada');
    await page.click('button[type="submit"]');
    
    // Verify changes
    await expect(page.locator('text=Projeto atualizado com sucesso')).toBeVisible();
    await expect(page.locator('text=Projeto Editado')).toBeVisible();
    await expect(page.locator('text=Descrição atualizada')).toBeVisible();
  });

  test('should delete project', async ({ page }) => {
    // First create a project
    await page.click('button:has-text("Novo Projeto")');
    await page.fill('input[name="name"]', 'Projeto para Deletar');
    await page.click('button[type="submit"]');
    
    // Delete the project
    await page.click('[data-testid="project-menu"]');
    await page.click('text=Excluir');
    
    // Confirm deletion
    await page.click('button:has-text("Confirmar")');
    
    // Verify deletion
    await expect(page.locator('text=Projeto excluído com sucesso')).toBeVisible();
    await expect(page.locator('text=Projeto para Deletar')).not.toBeVisible();
  });

  test('should navigate to project details', async ({ page }) => {
    // Create a project first
    await page.click('button:has-text("Novo Projeto")');
    await page.fill('input[name="name"]', 'Projeto Detalhes');
    await page.click('button[type="submit"]');
    
    // Click on project to view details
    await page.click('text=Projeto Detalhes');
    
    // Verify we're on project details page
    await expect(page).toHaveURL(/\/projects\/\d+/);
    await expect(page.locator('h1')).toContainText('Projeto Detalhes');
    await expect(page.locator('[data-testid="kanban-board"]')).toBeVisible();
  });
});

test.describe('Kanban Board', () => {
  test.beforeEach(async ({ page }) => {
    // Login and create a project
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    await page.click('button:has-text("Novo Projeto")');
    await page.fill('input[name="name"]', 'Projeto Kanban Test');
    await page.click('button[type="submit"]');
    
    // Navigate to project details
    await page.click('text=Projeto Kanban Test');
    await expect(page.locator('[data-testid="kanban-board"]')).toBeVisible();
  });

  test('should display kanban columns', async ({ page }) => {
    await expect(page.locator('[data-testid="column-TODO"]')).toBeVisible();
    await expect(page.locator('[data-testid="column-IN_PROGRESS"]')).toBeVisible();
    await expect(page.locator('[data-testid="column-DONE"]')).toBeVisible();
    
    await expect(page.locator('text=A Fazer')).toBeVisible();
    await expect(page.locator('text=Em Progresso')).toBeVisible();
    await expect(page.locator('text=Concluído')).toBeVisible();
  });

  test('should create new task', async ({ page }) => {
    await page.click('button:has-text("Nova Tarefa")');
    
    await page.fill('input[name="title"]', 'Tarefa E2E Test');
    await page.fill('textarea[name="description"]', 'Descrição da tarefa de teste');
    await page.selectOption('select[name="priority"]', 'HIGH');
    await page.selectOption('select[name="status"]', 'TODO');
    
    await page.click('button[type="submit"]');
    
    // Verify task was created
    await expect(page.locator('text=Tarefa criada com sucesso')).toBeVisible();
    await expect(page.locator('[data-testid="task-card"]')).toContainText('Tarefa E2E Test');
  });

  test('should drag and drop task between columns', async ({ page }) => {
    // Create a task first
    await page.click('button:has-text("Nova Tarefa")');
    await page.fill('input[name="title"]', 'Tarefa para Arrastar');
    await page.selectOption('select[name="status"]', 'TODO');
    await page.click('button[type="submit"]');
    
    // Wait for task to appear
    await expect(page.locator('text=Tarefa para Arrastar')).toBeVisible();
    
    // Drag task from TODO to IN_PROGRESS
    const taskCard = page.locator('[data-testid="task-card"]:has-text("Tarefa para Arrastar")');
    const inProgressColumn = page.locator('[data-testid="column-IN_PROGRESS"]');
    
    await taskCard.dragTo(inProgressColumn);
    
    // Verify task moved to IN_PROGRESS column
    await expect(page.locator('[data-testid="column-IN_PROGRESS"] >> text=Tarefa para Arrastar')).toBeVisible();
  });

  test('should edit task details', async ({ page }) => {
    // Create a task first
    await page.click('button:has-text("Nova Tarefa")');
    await page.fill('input[name="title"]', 'Tarefa para Editar');
    await page.fill('textarea[name="description"]', 'Descrição original');
    await page.click('button[type="submit"]');
    
    // Click on task to edit
    await page.click('text=Tarefa para Editar');
    
    // Edit task
    await page.fill('input[name="title"]', 'Tarefa Editada');
    await page.fill('textarea[name="description"]', 'Descrição atualizada');
    await page.selectOption('select[name="priority"]', 'HIGH');
    await page.click('button[type="submit"]');
    
    // Verify changes
    await expect(page.locator('text=Tarefa atualizada com sucesso')).toBeVisible();
    await expect(page.locator('text=Tarefa Editada')).toBeVisible();
  });

  test('should delete task', async ({ page }) => {
    // Create a task first
    await page.click('button:has-text("Nova Tarefa")');
    await page.fill('input[name="title"]', 'Tarefa para Deletar');
    await page.click('button[type="submit"]');
    
    // Delete task
    await page.click('[data-testid="task-menu"]');
    await page.click('text=Excluir');
    await page.click('button:has-text("Confirmar")');
    
    // Verify deletion
    await expect(page.locator('text=Tarefa excluída com sucesso')).toBeVisible();
    await expect(page.locator('text=Tarefa para Deletar')).not.toBeVisible();
  });

  test('should filter tasks by status', async ({ page }) => {
    // Create tasks with different statuses
    await page.click('button:has-text("Nova Tarefa")');
    await page.fill('input[name="title"]', 'Tarefa TODO');
    await page.selectOption('select[name="status"]', 'TODO');
    await page.click('button[type="submit"]');
    
    await page.click('button:has-text("Nova Tarefa")');
    await page.fill('input[name="title"]', 'Tarefa IN_PROGRESS');
    await page.selectOption('select[name="status"]', 'IN_PROGRESS');
    await page.click('button[type="submit"]');
    
    // Test filter
    await page.selectOption('[data-testid="status-filter"]', 'TODO');
    
    await expect(page.locator('text=Tarefa TODO')).toBeVisible();
    await expect(page.locator('text=Tarefa IN_PROGRESS')).not.toBeVisible();
    
    // Reset filter
    await page.selectOption('[data-testid="status-filter"]', 'ALL');
    
    await expect(page.locator('text=Tarefa TODO')).toBeVisible();
    await expect(page.locator('text=Tarefa IN_PROGRESS')).toBeVisible();
  });
});