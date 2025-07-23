import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AutomationsService } from './automations.service';
import { AutomationsResolver } from './automations.resolver';
import { Automation } from './entities/automation.entity';
import { AutomationLog } from './entities/automation-log.entity';
import { Project } from '../projects/entities/project.entity';
import { User } from '../auth/entities/user.entity';


@Module({
  imports: [
    TypeOrmModule.forFeature([
      Automation,
      AutomationLog,
      Project,
      User
    ])
  ],
  providers: [AutomationsResolver, AutomationsService],
  exports: [AutomationsService], // Exportar para uso em outros módulos
})
export class AutomationsModule {}