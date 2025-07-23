import React, { useState, useCallback } from 'react';
import {
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemAvatar,
  ListItemSecondaryAction,
  Avatar,
  IconButton,
  Typography,
  Box,
  Divider,
  Chip,
  Skeleton,
  useTheme,
  useMediaQuery,
  alpha,
  Collapse,
  SwipeableDrawer,
} from '@mui/material';
import {
  ExpandMore,
  ExpandLess,
  MoreVert,
  Delete,
  Edit,
  Star,
  StarBorder,
} from '@mui/icons-material';
import { PullToRefresh } from './PullToRefresh';

interface ListAction {
  icon: React.ReactNode;
  label: string;
  onClick: (item: any) => void;
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  destructive?: boolean;
}

interface MobileOptimizedListItem {
  id: string | number;
  primary: string;
  secondary?: string;
  tertiary?: string;
  avatar?: string | React.ReactNode;
  icon?: React.ReactNode;
  badge?: {
    content: string | number;
    color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  };
  actions?: ListAction[];
  expandable?: boolean;
  expandedContent?: React.ReactNode;
  metadata?: Record<string, any>;
}

interface MobileOptimizedListProps {
  items: MobileOptimizedListItem[];
  loading?: boolean;
  onItemClick?: (item: MobileOptimizedListItem) => void;
  onRefresh?: () => Promise<void>;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  enableSwipeActions?: boolean;
  enablePullToRefresh?: boolean;
  dense?: boolean;
  dividers?: boolean;
  stickyHeader?: boolean;
  headerContent?: React.ReactNode;
  footerContent?: React.ReactNode;
  virtualScrolling?: boolean;
  itemHeight?: number;
}

export const MobileOptimizedList: React.FC<MobileOptimizedListProps> = ({
  items,
  loading = false,
  onItemClick,
  onRefresh,
  emptyMessage = 'Nenhum item encontrado',
  emptyIcon,
  enableSwipeActions = true,
  enablePullToRefresh = true,
  dense = false,
  dividers = true,
  stickyHeader = false,
  headerContent,
  footerContent,
  virtualScrolling = false,
  itemHeight = 72,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [expandedItems, setExpandedItems] = useState<Set<string | number>>(new Set());
  const [swipeDrawerOpen, setSwipeDrawerOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MobileOptimizedListItem | null>(null);

  const handleItemExpand = useCallback((itemId: string | number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  }, [expandedItems]);

  const handleSwipeAction = useCallback((item: MobileOptimizedListItem) => {
    if (enableSwipeActions && item.actions && item.actions.length > 0) {
      setSelectedItem(item);
      setSwipeDrawerOpen(true);
    }
  }, [enableSwipeActions]);

  const renderLoadingSkeleton = () => {
    return (
      <List sx={{ p: 0 }}>
        {[...Array(8)].map((_, index) => (
          <ListItem key={index} sx={{ py: { xs: 2, sm: 1.5 } }}>
            <ListItemAvatar>
              <Skeleton variant="circular" width={40} height={40} />
            </ListItemAvatar>
            <ListItemText
              primary={<Skeleton variant="text" width="60%" />}
              secondary={<Skeleton variant="text" width="40%" />}
            />
            <ListItemSecondaryAction>
              <Skeleton variant="circular" width={24} height={24} />
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>
    );
  };

  const renderEmptyState = () => {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          py: 8,
          px: 3,
          textAlign: 'center',
        }}
      >
        {emptyIcon && (
          <Box sx={{ mb: 2, opacity: 0.5 }}>
            {emptyIcon}
          </Box>
        )}
        <Typography variant="h6" color="text.secondary" gutterBottom>
          {emptyMessage}
        </Typography>
      </Box>
    );
  };

  const renderListItem = (item: MobileOptimizedListItem, index: number) => {
    const isExpanded = expandedItems.has(item.id);
    const hasActions = item.actions && item.actions.length > 0;

    return (
      <React.Fragment key={item.id}>
        <ListItem
          component={onItemClick ? "button" : "div"}
          onClick={() => onItemClick?.(item)}
          onTouchStart={() => isMobile && handleSwipeAction(item)}
          sx={{
            py: { xs: 2, sm: dense ? 1 : 1.5 },
            px: { xs: 2, sm: 2 },
            minHeight: { xs: itemHeight, sm: dense ? 56 : 72 },
            borderRadius: { xs: 12, sm: 8 },
            mx: { xs: 1, sm: 0 },
            mb: { xs: 1, sm: 0 },
            cursor: onItemClick ? 'pointer' : 'default',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              backgroundColor: alpha(theme.palette.action.hover, 0.08),
            },
            '&:active': {
              transform: 'scale(0.98)',
              backgroundColor: alpha(theme.palette.action.selected, 0.12),
            },
          }}
        >
          {(item.avatar || item.icon) && (
            <ListItemAvatar>
              {typeof item.avatar === 'string' ? (
                <Avatar 
                  src={item.avatar} 
                  sx={{ 
                    width: { xs: 40, sm: 40 }, 
                    height: { xs: 40, sm: 40 } 
                  }}
                >
                  {item.primary.charAt(0).toUpperCase()}
                </Avatar>
              ) : item.avatar ? (
                <Avatar 
                  sx={{ 
                    width: { xs: 40, sm: 40 }, 
                    height: { xs: 40, sm: 40 } 
                  }}
                >
                  {item.avatar}
                </Avatar>
              ) : (
                <Box 
                  sx={{ 
                    width: { xs: 40, sm: 40 }, 
                    height: { xs: 40, sm: 40 },
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: theme.palette.primary.main,
                  }}
                >
                  {item.icon}
                </Box>
              )}
            </ListItemAvatar>
          )}
          
          <ListItemText
            primary={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography
                  variant="body1"
                  sx={{
                    fontSize: { xs: '0.9rem', sm: '1rem' },
                    fontWeight: 500,
                    lineHeight: 1.4,
                  }}
                >
                  {item.primary}
                </Typography>
                {item.badge && (
                  <Chip
                    label={item.badge.content}
                    size="small"
                    color={item.badge.color || 'primary'}
                    sx={{
                      height: { xs: 20, sm: 24 },
                      fontSize: { xs: '0.7rem', sm: '0.75rem' },
                      '& .MuiChip-label': {
                        px: { xs: 1, sm: 1.5 },
                      },
                    }}
                  />
                )}
              </Box>
            }
            secondary={
              <Box>
                {item.secondary && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      fontSize: { xs: '0.8rem', sm: '0.875rem' },
                      lineHeight: 1.3,
                      mb: item.tertiary ? 0.5 : 0,
                    }}
                  >
                    {item.secondary}
                  </Typography>
                )}
                {item.tertiary && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      fontSize: { xs: '0.75rem', sm: '0.75rem' },
                      lineHeight: 1.2,
                    }}
                  >
                    {item.tertiary}
                  </Typography>
                )}
              </Box>
            }
          />
          
          <ListItemSecondaryAction>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {item.expandable && (
                <IconButton
                  edge="end"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleItemExpand(item.id);
                  }}
                  sx={{
                    minWidth: { xs: 40, sm: 48 },
                    minHeight: { xs: 40, sm: 48 },
                  }}
                >
                  {isExpanded ? <ExpandLess /> : <ExpandMore />}
                </IconButton>
              )}
              
              {hasActions && !isMobile && (
                <IconButton
                  edge="end"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSwipeAction(item);
                  }}
                  sx={{
                    minWidth: { xs: 40, sm: 48 },
                    minHeight: { xs: 40, sm: 48 },
                  }}
                >
                  <MoreVert />
                </IconButton>
              )}
            </Box>
          </ListItemSecondaryAction>
        </ListItem>
        
        {item.expandable && item.expandedContent && (
          <Collapse in={isExpanded}>
            <Box sx={{ px: { xs: 3, sm: 2 }, pb: 2 }}>
              {item.expandedContent}
            </Box>
          </Collapse>
        )}
        
        {dividers && index < items.length - 1 && (
          <Divider 
            sx={{ 
              mx: { xs: 2, sm: 0 },
              opacity: { xs: 0.6, sm: 1 },
            }} 
          />
        )}
      </React.Fragment>
    );
  };

  const renderSwipeActions = () => {
    if (!selectedItem?.actions) return null;

    return (
      <SwipeableDrawer
        anchor="bottom"
        open={swipeDrawerOpen}
        onClose={() => setSwipeDrawerOpen(false)}
        onOpen={() => setSwipeDrawerOpen(true)}
        sx={{
          '& .MuiDrawer-paper': {
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            maxHeight: '50vh',
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Box
            sx={{
              width: 40,
              height: 4,
              backgroundColor: theme.palette.divider,
              borderRadius: 2,
              mx: 'auto',
              mb: 2,
            }}
          />
          
          <Typography variant="h6" sx={{ mb: 2, textAlign: 'center' }}>
            {selectedItem.primary}
          </Typography>
          
          <List sx={{ p: 0 }}>
            {selectedItem.actions.map((action, index) => (
              <ListItem
                key={index}
                button
                onClick={() => {
                  action.onClick(selectedItem);
                  setSwipeDrawerOpen(false);
                }}
                sx={{
                  borderRadius: 12,
                  mb: 1,
                  minHeight: 56,
                  '&:hover': {
                    backgroundColor: alpha(
                      theme.palette[action.color || 'primary'].main,
                      0.08
                    ),
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    color: action.destructive
                      ? theme.palette.error.main
                      : theme.palette[action.color || 'primary'].main,
                  }}
                >
                  {action.icon}
                </ListItemIcon>
                <ListItemText
                  primary={action.label}
                  sx={{
                    '& .MuiListItemText-primary': {
                      color: action.destructive
                        ? theme.palette.error.main
                        : 'inherit',
                      fontWeight: action.destructive ? 600 : 400,
                    },
                  }}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      </SwipeableDrawer>
    );
  };

  const listContent = (
    <Box>
      {headerContent && (
        <Box
          sx={{
            position: stickyHeader ? 'sticky' : 'static',
            top: 0,
            zIndex: 1,
            backgroundColor: theme.palette.background.paper,
            borderBottom: stickyHeader ? `1px solid ${alpha(theme.palette.divider, 0.1)}` : 'none',
          }}
        >
          {headerContent}
        </Box>
      )}
      
      {loading ? (
        renderLoadingSkeleton()
      ) : items.length === 0 ? (
        renderEmptyState()
      ) : (
        <List 
          sx={{ 
            p: 0,
            '& .MuiListItem-root:last-child': {
              mb: 0,
            },
          }}
        >
          {items.map((item, index) => renderListItem(item, index))}
        </List>
      )}
      
      {footerContent && (
        <Box sx={{ mt: 2 }}>
          {footerContent}
        </Box>
      )}
      
      {renderSwipeActions()}
    </Box>
  );

  if (enablePullToRefresh && onRefresh && isMobile) {
    return (
      <PullToRefresh onRefresh={onRefresh}>
        {listContent}
      </PullToRefresh>
    );
  }

  return listContent;
};

export default MobileOptimizedList;