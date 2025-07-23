import { DataSource } from 'typeorm';
import { seedDatabase } from './seed-data';
import { User } from './auth/entities/user.entity';
import { Project } from './projects/entities/project.entity';
import { Section } from './projects/entities/section.entity';
import { Task } from './projects/entities/task.entity';
import { Comment } from './comments/entities/comment.entity';
import { Notification } from './notifications/entities/notification.entity';
import { NotificationPreferences } from './notifications/entities/notification-preferences.entity';
import { Automation } from './automations/entities/automation.entity';
import { AutomationLog } from './automations/entities/automation-log.entity';

async function runSeed() {
  console.log('🚀 Iniciando processo de seed...');

  // Configuração do DataSource (similar ao app.module.ts)
  const dataSource = new DataSource({
    type: 'better-sqlite3',
    database: 'database.sqlite',
    entities: [User, Project, Section, Task, Comment, Notification, NotificationPreferences, Automation, AutomationLog],
    synchronize: true,
    logging: false,
    extra: {
      pragma: 'foreign_keys = OFF'
    }
  });

  try {
    // Conectar ao banco
    await dataSource.initialize();
    console.log('✅ Conexão com banco estabelecida');

    // Executar seed
    await seedDatabase(dataSource);

    console.log('🎉 Processo de seed finalizado com sucesso!');
  } catch (error) {
    console.error('❌ Erro durante o seed:', error);
  } finally {
    // Fechar conexão
    await dataSource.destroy();
    console.log('🔌 Conexão com banco fechada');
    process.exit(0);
  }
}

// Executar o seed
runSeed();