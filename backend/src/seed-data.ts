import { DataSource } from 'typeorm';
import { User } from './auth/entities/user.entity';
import { Project } from './projects/entities/project.entity';
import { Section } from './projects/entities/section.entity';
import { Task, TaskPriority } from './projects/entities/task.entity';
import { Automation, TriggerType, ActionType } from './automations/entities/automation.entity';
import * as bcrypt from 'bcrypt';

export async function seedDatabase(dataSource: DataSource) {
  console.log('🌱 Iniciando seed do banco de dados...');

  // Desabilitar foreign keys
  await dataSource.query('PRAGMA foreign_keys = OFF');

  // Repositórios
  const userRepo = dataSource.getRepository(User);
  const projectRepo = dataSource.getRepository(Project);
  const sectionRepo = dataSource.getRepository(Section);
  const taskRepo = dataSource.getRepository(Task);
  const automationRepo = dataSource.getRepository(Automation);

  // Limpar todos os dados para começar do zero
  await automationRepo.clear();
  await taskRepo.clear();
  await sectionRepo.clear();
  await projectRepo.clear();
  await userRepo.clear();

  // Reabilitar foreign keys
  await dataSource.query('PRAGMA foreign_keys = ON');

  // Criar o usuário
  const hashedPassword = await bcrypt.hash('123456', 10);
  const user = userRepo.create({
    name: 'Adriano Lengruber',
    email: 'adrianolengruber@hotmail.com',
    password: hashedPassword,
  });
  const savedUser = await userRepo.save(user);
  console.log('✅ Usuário criado:', savedUser.email);

  // Criar 3 projetos distintos
  const projectsData = [
    {
      name: '🚀 Sistema de E-commerce',
      description: 'Desenvolvimento de plataforma completa de vendas online com integração de pagamentos e gestão de estoque.',
      startDate: new Date('2025-01-15'),
      endDate: new Date('2025-06-30'),
    },
    {
      name: '📱 App Mobile Fitness',
      description: 'Aplicativo móvel para acompanhamento de exercícios, dieta e metas de saúde com gamificação.',
      startDate: new Date('2025-02-01'),
      endDate: new Date('2025-08-15'),
    },
    {
      name: '🏢 Portal Corporativo',
      description: 'Sistema interno para gestão de funcionários, documentos e processos administrativos.',
      startDate: new Date('2025-03-01'),
      endDate: new Date('2025-09-30'),
    },
  ];

  const projects = [];
  for (const projectData of projectsData) {
    const project = projectRepo.create({
      ...projectData,
      owner: savedUser,
    });
    const savedProject = await projectRepo.save(project);
    projects.push(savedProject);
    console.log('✅ Projeto criado:', savedProject.name);
  }

  // Seções padrão para cada projeto
  const sectionsData = [
    { name: '📋 Backlog', order: 1 },
    { name: '🔄 Em Progresso', order: 2 },
    { name: '🔍 Em Revisão', order: 3 },
    { name: '✅ Concluído', order: 4 },
  ];

  // Criar seções para cada projeto
  const allSections = [];
  for (const project of projects) {
    for (const sectionData of sectionsData) {
      const section = sectionRepo.create({
        ...sectionData,
        project,
      });
      const savedSection = await sectionRepo.save(section);
      allSections.push(savedSection);
    }
  }

  // Tarefas para cada projeto com status e datas diferentes
  const tasksData = [
    // Projeto 1: E-commerce
    {
      projectIndex: 0,
      tasks: [
        {
          title: 'Configurar ambiente de desenvolvimento',
          description: 'Setup inicial do projeto com React, Node.js e banco de dados PostgreSQL.',
          priority: TaskPriority.HIGH,
          dueDate: new Date('2025-01-25'),
          sectionIndex: 3, // Concluído
          completed: true,
        },
        {
          title: 'Implementar autenticação de usuários',
          description: 'Sistema de login/registro com JWT e validação de email.',
          priority: TaskPriority.HIGH,
          dueDate: new Date('2025-02-10'),
          sectionIndex: 1, // Em Progresso
          completed: false,
        },
        {
          title: 'Desenvolver catálogo de produtos',
          description: 'Interface para exibição, filtros e busca de produtos.',
          priority: TaskPriority.MEDIUM,
          dueDate: new Date('2025-03-15'),
          sectionIndex: 0, // Backlog
          completed: false,
        },
        {
          title: 'Integrar gateway de pagamento',
          description: 'Implementar Stripe/PayPal para processamento de pagamentos.',
          priority: TaskPriority.HIGH,
          dueDate: new Date('2025-04-20'),
          sectionIndex: 0, // Backlog
          completed: false,
        },
      ],
    },
    // Projeto 2: App Mobile
    {
      projectIndex: 1,
      tasks: [
        {
          title: 'Design da interface do usuário',
          description: 'Criar wireframes e protótipos no Figma para todas as telas.',
          priority: TaskPriority.MEDIUM,
          dueDate: new Date('2025-02-15'),
          sectionIndex: 2, // Em Revisão
          completed: false,
        },
        {
          title: 'Implementar tracking de exercícios',
          description: 'Funcionalidade para registrar e acompanhar atividades físicas.',
          priority: TaskPriority.HIGH,
          dueDate: new Date('2025-03-30'),
          sectionIndex: 1, // Em Progresso
          completed: false,
        },
        {
          title: 'Sistema de gamificação',
          description: 'Pontos, badges e rankings para motivar usuários.',
          priority: TaskPriority.LOW,
          dueDate: new Date('2025-05-15'),
          sectionIndex: 0, // Backlog
          completed: false,
        },
        {
          title: 'Integração com wearables',
          description: 'Conectar com Apple Watch, Fitbit e outros dispositivos.',
          priority: TaskPriority.MEDIUM,
          dueDate: new Date('2025-06-30'),
          sectionIndex: 0, // Backlog
          completed: false,
        },
      ],
    },
    // Projeto 3: Portal Corporativo
    {
      projectIndex: 2,
      tasks: [
        {
          title: 'Análise de requisitos',
          description: 'Levantamento detalhado das necessidades dos departamentos.',
          priority: TaskPriority.HIGH,
          dueDate: new Date('2025-03-15'),
          sectionIndex: 3, // Concluído
          completed: true,
        },
        {
          title: 'Módulo de gestão de funcionários',
          description: 'CRUD completo para dados de RH e organograma.',
          priority: TaskPriority.HIGH,
          dueDate: new Date('2025-04-30'),
          sectionIndex: 1, // Em Progresso
          completed: false,
        },
        {
          title: 'Sistema de documentos',
          description: 'Upload, versionamento e controle de acesso a documentos.',
          priority: TaskPriority.MEDIUM,
          dueDate: new Date('2025-06-15'),
          sectionIndex: 2, // Em Revisão
          completed: false,
        },
        {
          title: 'Dashboard executivo',
          description: 'Relatórios e métricas para tomada de decisão.',
          priority: TaskPriority.LOW,
          dueDate: new Date('2025-08-30'),
          sectionIndex: 0, // Backlog
          completed: false,
        },
      ],
    },
  ];

  // Criar tarefas
  for (const projectTasks of tasksData) {
    const project = projects[projectTasks.projectIndex];
    const projectSections = allSections.filter(s => s.project.id === project.id);

    for (const taskData of projectTasks.tasks) {
      const section = projectSections[taskData.sectionIndex];
      const task = taskRepo.create({
        title: taskData.title,
        description: taskData.description,
        priority: taskData.priority,
        dueDate: taskData.dueDate,
        completed: taskData.completed,
        section,
        assignee: savedUser,
      });
      await taskRepo.save(task);
    }
  }

  // Criar automação para o primeiro projeto
  const automation = automationRepo.create({
    name: '🔔 Notificação de Prazo Vencido',
    description: 'Envia notificação quando uma tarefa passa do prazo de entrega.',
    triggerType: TriggerType.TASK_DUE_DATE,
    actionType: ActionType.SEND_NOTIFICATION,
    triggerConditions: JSON.stringify({
      priority: [TaskPriority.HIGH, TaskPriority.MEDIUM],
      daysOverdue: 1,
    }),
    actionParameters: JSON.stringify({
      message: 'A tarefa "{{task.title}}" está atrasada há {{daysOverdue}} dia(s)!',
      channels: ['EMAIL', 'IN_APP'],
    }),
    isActive: true,
    project: projects[0],
    createdBy: savedUser,
  });
  await automationRepo.save(automation);

  console.log('🎉 Seed concluído com sucesso!');
  console.log('📊 Dados criados:');
  console.log(`   - 1 usuário: ${savedUser.email}`);
  console.log(`   - ${projects.length} projetos`);
  console.log(`   - ${allSections.length} seções`);
  console.log(`   - ${tasksData.reduce((acc, p) => acc + p.tasks.length, 0)} tarefas`);
  console.log('   - 1 automação');
}