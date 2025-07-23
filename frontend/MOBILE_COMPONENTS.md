# Componentes Mobile Otimizados - Fusion Flow

Este documento descreve os componentes e hooks criados especificamente para otimizar a experiência mobile no Fusion Flow.

## 📱 Componentes Implementados

### 1. MobileOptimizedFab

**Localização**: `src/components/common/MobileOptimizedFab.tsx`

**Descrição**: Floating Action Button otimizado para mobile com suporte a múltiplas ações (SpeedDial).

**Características**:
- Touch targets mínimos de 56px
- Posicionamento responsivo (bottom-right, bottom-center, bottom-left)
- Suporte a hide-on-scroll
- Transições suaves e feedback visual
- SpeedDial com backdrop em mobile

**Uso**:
```tsx
import { MobileOptimizedFab } from '@/components/common';

// FAB simples
<MobileOptimizedFab
  icon={<Add />}
  onClick={handleAdd}
  tooltip="Adicionar item"
/>

// SpeedDial com múltiplas ações
<MobileOptimizedFab
  actions={[
    { icon: <Edit />, name: 'Editar', onClick: handleEdit },
    { icon: <Delete />, name: 'Excluir', onClick: handleDelete },
  ]}
/>
```

### 2. MobileOptimizedModal

**Localização**: `src/components/common/MobileOptimizedModal.tsx`

**Descrição**: Modal adaptativo que se comporta como dialog em desktop e drawer/fullscreen em mobile.

**Características**:
- Três variantes: dialog, drawer, fullscreen
- Suporte a swipe-to-close
- Transições otimizadas
- Touch-friendly headers e botões
- Prevenção de scroll do body

**Uso**:
```tsx
import { MobileOptimizedModal } from '@/components/common';

<MobileOptimizedModal
  open={open}
  onClose={handleClose}
  title="Título do Modal"
  mobileVariant="drawer"
  mobilePosition="bottom"
  swipeToClose
  actions={
    <>
      <Button onClick={handleCancel}>Cancelar</Button>
      <Button variant="contained" onClick={handleSave}>Salvar</Button>
    </>
  }
>
  <Typography>Conteúdo do modal...</Typography>
</MobileOptimizedModal>
```

### 3. MobileOptimizedTooltip

**Localização**: `src/components/common/MobileOptimizedTooltip.tsx`

**Descrição**: Tooltip que se adapta ao dispositivo - popover em mobile, tooltip tradicional em desktop.

**Características**:
- Long-press para ativar em mobile
- Click-to-show opcional
- Posicionamento inteligente
- Fallback para áudio quando vibração não disponível
- Auto-hide configurável

**Uso**:
```tsx
import { MobileOptimizedTooltip } from '@/components/common';

<MobileOptimizedTooltip
  title="Informação importante"
  mobileVariant="popover"
  showOnLongPress
  touchDelay={500}
>
  <IconButton>
    <Info />
  </IconButton>
</MobileOptimizedTooltip>
```

### 4. MobileOptimizedSnackbar

**Localização**: `src/components/common/MobileOptimizedSnackbar.tsx`

**Descrição**: Snackbar otimizado para mobile com swipe-to-dismiss e posicionamento responsivo.

**Características**:
- Posicionamento responsivo (top, bottom, center)
- Swipe-to-dismiss
- Progress bar visual
- Touch targets adequados (44px mínimo)
- Suporte a diferentes variantes (success, error, warning, etc.)

**Uso**:
```tsx
import { MobileOptimizedSnackbar } from '@/components/common';

<MobileOptimizedSnackbar
  open={open}
  onClose={handleClose}
  message="Operação realizada com sucesso!"
  variant="success"
  mobilePosition="bottom"
  swipeToClose
  showProgress
  actionLabel="Desfazer"
  onActionClick={handleUndo}
/>
```

### 5. MobileOptimizedTable

**Localização**: `src/components/common/MobileOptimizedTable.tsx`

**Descrição**: Tabela que se transforma em cards em mobile para melhor usabilidade.

**Características**:
- Visualização em cards para mobile
- Colunas expansíveis
- Paginação otimizada
- Skeleton loading
- Ordenação e filtros adaptados

**Uso**:
```tsx
import { MobileOptimizedTable } from '@/components/common';

const columns = [
  { id: 'name', label: 'Nome', sortable: true },
  { id: 'email', label: 'Email', hideOnMobile: true },
  { id: 'status', label: 'Status' },
];

<MobileOptimizedTable
  columns={columns}
  rows={data}
  loading={loading}
  onRowClick={handleRowClick}
  pagination={{
    page: 0,
    rowsPerPage: 10,
    count: total,
    onPageChange: handlePageChange,
  }}
  renderMobileCard={(row) => (
    <Card>
      <CardContent>
        <Typography variant="h6">{row.name}</Typography>
        <Typography color="textSecondary">{row.email}</Typography>
        <Chip label={row.status} size="small" />
      </CardContent>
    </Card>
  )}
/>
```

### 6. MobileOptimizedList

**Localização**: `src/components/common/MobileOptimizedList.tsx`

**Descrição**: Lista otimizada para mobile com swipe actions e pull-to-refresh.

**Características**:
- Swipe actions (esquerda/direita)
- Pull-to-refresh
- Virtual scrolling para performance
- Estados vazios otimizados
- Skeleton loading

**Uso**:
```tsx
import { MobileOptimizedList } from '@/components/common';

const items = [
  {
    id: 1,
    primary: 'Item 1',
    secondary: 'Descrição do item',
    avatar: '/avatar1.jpg',
  },
];

const swipeActions = {
  left: [
    {
      icon: <Archive />,
      label: 'Arquivar',
      color: 'primary',
      onAction: handleArchive,
    },
  ],
  right: [
    {
      icon: <Delete />,
      label: 'Excluir',
      color: 'error',
      onAction: handleDelete,
    },
  ],
};

<MobileOptimizedList
  items={items}
  loading={loading}
  onItemClick={handleItemClick}
  onRefresh={handleRefresh}
  swipeActions={swipeActions}
  enablePullToRefresh
  virtualScrolling
/>
```

## 🎣 Hooks Implementados

### 1. useSwipeGesture

**Localização**: `src/hooks/useSwipeGesture.ts`

**Descrição**: Hook para detectar e gerenciar gestos de swipe.

**Uso**:
```tsx
import { useSwipeGesture } from '@/hooks';

const { swipeHandlers, isSwipeInProgress } = useSwipeGesture({
  onSwipeLeft: () => console.log('Swipe left'),
  onSwipeRight: () => console.log('Swipe right'),
  minSwipeDistance: 50,
  enabledDirections: ['left', 'right'],
  onSwipeProgress: (progress, direction) => {
    console.log(`Swipe ${direction}: ${progress * 100}%`);
  },
});

<div {...swipeHandlers}>
  Conteúdo com suporte a swipe
</div>
```

### 2. useMobileDetection

**Localização**: `src/hooks/useMobileDetection.ts`

**Descrição**: Hook para detectar características do dispositivo e otimizar a experiência.

**Uso**:
```tsx
import { useMobileDetection } from '@/hooks';

const {
  isMobile,
  isTablet,
  isTouchDevice,
  isPortrait,
  getOptimalTouchTarget,
  shouldUseMobileLayout,
} = useMobileDetection({
  onOrientationChange: (isPortrait) => {
    console.log('Orientação mudou:', isPortrait ? 'Portrait' : 'Landscape');
  },
});

const touchTargetSize = getOptimalTouchTarget();
```

### 3. useHapticFeedback

**Localização**: `src/hooks/useHapticFeedback.ts`

**Descrição**: Hook para fornecer feedback tátil em dispositivos móveis.

**Uso**:
```tsx
import { useHapticFeedback } from '@/hooks';

const {
  vibrate,
  success,
  error,
  light,
  medium,
  heavy,
  isSupported,
} = useHapticFeedback({
  enabled: true,
  fallbackToAudio: true,
});

const handleButtonClick = async () => {
  await light(); // Vibração leve
  // Executar ação
};

const handleSuccess = async () => {
  await success(); // Padrão de sucesso
};

const handleError = async () => {
  await error(); // Padrão de erro
};
```

## 📦 Exportações

Todos os componentes e hooks estão disponíveis através dos arquivos de índice:

```tsx
// Componentes
import {
  MobileOptimizedFab,
  MobileOptimizedModal,
  MobileOptimizedTooltip,
  MobileOptimizedSnackbar,
  MobileOptimizedTable,
  MobileOptimizedList,
} from '@/components/common';

// Hooks
import {
  useSwipeGesture,
  useMobileDetection,
  useHapticFeedback,
} from '@/hooks';
```

## 🎯 Diretrizes de Uso

### Touch Targets
- Mínimo de 44px para elementos interativos
- 48px recomendado para ações primárias
- 56px para FABs e elementos importantes

### Gestos
- Swipe horizontal para ações (arquivar, excluir)
- Swipe vertical para navegação (fechar modais)
- Long-press para tooltips e menus contextuais
- Pull-to-refresh para atualizar listas

### Feedback
- Haptic feedback para confirmações
- Transições suaves (300ms ou menos)
- Estados de loading visíveis
- Feedback visual imediato para toques

### Acessibilidade
- ARIA labels em todos os elementos interativos
- Contraste mínimo de 4.5:1
- Suporte a screen readers
- Navegação por teclado quando aplicável

## 🔧 Configuração

Para usar os componentes mobile otimizados, certifique-se de que o Material-UI está configurado com os breakpoints corretos:

```tsx
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 768,
      lg: 1024,
      xl: 1200,
    },
  },
});
```

## 📱 Testes

Para testar os componentes mobile:

1. Use as ferramentas de desenvolvedor do navegador
2. Ative o modo de dispositivo móvel
3. Teste diferentes tamanhos de tela
4. Verifique gestos de toque
5. Teste em dispositivos reais quando possível

## 🚀 Performance

Todos os componentes foram otimizados para performance mobile:

- Lazy loading quando apropriado
- Debounce em eventos de scroll e resize
- Memoização de cálculos pesados
- Virtual scrolling para listas longas
- Transições otimizadas com `transform` e `opacity`

## 📚 Próximos Passos

1. Implementar testes automatizados
2. Adicionar mais padrões de haptic feedback
3. Otimizar performance com code splitting
4. Adicionar suporte a PWA
5. Implementar modo offline básico