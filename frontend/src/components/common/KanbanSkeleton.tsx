import React from 'react';
import {
  Box,
  Paper,
  Skeleton,
  useTheme,
  alpha,
} from '@mui/material';

interface KanbanSkeletonProps {
  sectionsCount?: number;
  tasksPerSection?: number;
}

const KanbanSkeleton: React.FC<KanbanSkeletonProps> = ({
  sectionsCount = 3,
  tasksPerSection = 3,
}) => {
  const theme = useTheme();

  const TaskSkeleton = ({ delay = 0 }: { delay?: number }) => (
    <Paper
      sx={{
        p: 2,
        mb: 2,
        bgcolor: 'background.paper',
        border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
        borderRadius: 2,
        animation: `pulse 1.5s ease-in-out ${delay}ms infinite`,
        '@keyframes pulse': {
          '0%': {
            opacity: 1,
          },
          '50%': {
            opacity: 0.7,
          },
          '100%': {
            opacity: 1,
          },
        },
      }}
    >
      {/* Título da tarefa */}
      <Skeleton
        variant="text"
        width="80%"
        height={24}
        sx={{
          mb: 1,
          borderRadius: 1,
        }}
      />
      
      {/* Descrição da tarefa */}
      <Skeleton
        variant="text"
        width="60%"
        height={16}
        sx={{
          mb: 2,
          borderRadius: 1,
        }}
      />
      
      {/* Chips de prioridade e data */}
      <Box display="flex" gap={1} mb={1.5}>
        <Skeleton
          variant="rounded"
          width={60}
          height={24}
          sx={{ borderRadius: 3 }}
        />
        <Skeleton
          variant="rounded"
          width={50}
          height={24}
          sx={{ borderRadius: 3 }}
        />
      </Box>
      
      {/* Área de ações */}
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Box display="flex" alignItems="center">
          <Skeleton
            variant="circular"
            width={20}
            height={20}
            sx={{ mr: 1 }}
          />
          <Skeleton
            variant="text"
            width={60}
            height={16}
            sx={{ borderRadius: 1 }}
          />
        </Box>
        <Skeleton
          variant="circular"
          width={24}
          height={24}
        />
      </Box>
    </Paper>
  );

  const SectionSkeleton = ({ sectionIndex }: { sectionIndex: number }) => (
    <Box sx={{ minWidth: 300, mr: 2 }}>
      <Paper
        sx={{
          p: 2,
          minHeight: 400,
          bgcolor: alpha(theme.palette.background.default, 0.5),
          border: `2px dashed ${alpha(theme.palette.divider, 0.2)}`,
          borderRadius: 2,
          animation: `fadeIn 0.6s ease-out ${sectionIndex * 200}ms both`,
          '@keyframes fadeIn': {
            '0%': {
              opacity: 0,
              transform: 'translateY(20px)',
            },
            '100%': {
              opacity: 1,
              transform: 'translateY(0)',
            },
          },
        }}
      >
        {/* Cabeçalho da seção */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Skeleton
            variant="text"
            width="70%"
            height={28}
            sx={{
              borderRadius: 1,
            }}
          />
          <Box display="flex" gap={1}>
            <Skeleton
              variant="circular"
              width={32}
              height={32}
            />
            <Skeleton
              variant="circular"
              width={32}
              height={32}
            />
          </Box>
        </Box>
        
        {/* Tarefas da seção */}
        {Array.from({ length: tasksPerSection }).map((_, taskIndex) => (
          <TaskSkeleton
            key={taskIndex}
            delay={sectionIndex * 200 + taskIndex * 100}
          />
        ))}
        
        {/* Botão de adicionar tarefa */}
        <Box
          sx={{
            border: `2px dashed ${alpha(theme.palette.primary.main, 0.3)}`,
            borderRadius: 2,
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: alpha(theme.palette.primary.main, 0.05),
          }}
        >
          <Skeleton
            variant="text"
            width={120}
            height={20}
            sx={{ borderRadius: 1 }}
          />
        </Box>
      </Paper>
    </Box>
  );

  return (
    <Box>
      {/* Cabeçalho do projeto */}
      <Box mb={4}>
        <Skeleton
          variant="text"
          width="40%"
          height={40}
          sx={{
            mb: 2,
            borderRadius: 1,
          }}
        />
        <Skeleton
          variant="text"
          width="60%"
          height={20}
          sx={{
            mb: 3,
            borderRadius: 1,
          }}
        />
        
        {/* Botões de ação */}
        <Box display="flex" gap={2}>
          <Skeleton
            variant="rounded"
            width={120}
            height={36}
            sx={{ borderRadius: 1 }}
          />
          <Skeleton
            variant="rounded"
            width={100}
            height={36}
            sx={{ borderRadius: 1 }}
          />
        </Box>
      </Box>
      
      {/* Seções do Kanban */}
      <Box
        sx={{
          display: 'flex',
          overflowX: 'auto',
          pb: 2,
          '&::-webkit-scrollbar': {
            height: 8,
          },
          '&::-webkit-scrollbar-track': {
            bgcolor: alpha(theme.palette.divider, 0.1),
            borderRadius: 4,
          },
          '&::-webkit-scrollbar-thumb': {
            bgcolor: alpha(theme.palette.divider, 0.3),
            borderRadius: 4,
            '&:hover': {
              bgcolor: alpha(theme.palette.divider, 0.5),
            },
          },
        }}
      >
        {Array.from({ length: sectionsCount }).map((_, sectionIndex) => (
          <SectionSkeleton
            key={sectionIndex}
            sectionIndex={sectionIndex}
          />
        ))}
      </Box>
    </Box>
  );
};

export default KanbanSkeleton;