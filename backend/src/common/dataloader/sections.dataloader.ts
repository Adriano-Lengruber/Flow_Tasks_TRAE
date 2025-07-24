import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Section } from '../../projects/entities/section.entity';
import DataLoader from 'dataloader';

@Injectable()
export class SectionsDataLoader {
  constructor(
    @InjectRepository(Section)
    private sectionsRepository: Repository<Section>,
  ) {}

  createLoader(): DataLoader<string, Section[]> {
    return new DataLoader<string, Section[]>(async (projectIds: readonly string[]) => {
      const sections = await this.sectionsRepository.find({
        where: { project: { id: In([...projectIds]) } },
        relations: ['tasks'],
        order: { createdAt: 'ASC' },
      });

      // Agrupar seções por projectId
      const sectionsByProjectId = new Map<string, Section[]>();
      
      sections.forEach(section => {
        const projectId = section.project.id;
        if (!sectionsByProjectId.has(projectId)) {
          sectionsByProjectId.set(projectId, []);
        }
        sectionsByProjectId.get(projectId)!.push(section);
      });

      // Retornar na mesma ordem dos projectIds
      return projectIds.map(projectId => sectionsByProjectId.get(projectId) || []);
    });
  }
}