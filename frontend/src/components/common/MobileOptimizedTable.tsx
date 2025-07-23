import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  IconButton,
  Collapse,
  useTheme,
  useMediaQuery,
  alpha,
  Skeleton,
} from '@mui/material';
import {
  ExpandMore,
  ExpandLess,
  MoreVert,
} from '@mui/icons-material';

interface Column {
  id: string;
  label: string;
  minWidth?: number;
  align?: 'right' | 'left' | 'center';
  format?: (value: any) => string;
  hideOnMobile?: boolean;
  priority?: 'high' | 'medium' | 'low'; // Para ordenar colunas em mobile
}

interface MobileOptimizedTableProps {
  columns: Column[];
  rows: any[];
  loading?: boolean;
  pagination?: {
    count: number;
    page: number;
    rowsPerPage: number;
    onPageChange: (event: unknown, newPage: number) => void;
    onRowsPerPageChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  };
  onRowClick?: (row: any) => void;
  renderMobileCard?: (row: any, index: number) => React.ReactNode;
  emptyMessage?: string;
  stickyHeader?: boolean;
}

export const MobileOptimizedTable: React.FC<MobileOptimizedTableProps> = ({
  columns,
  rows,
  loading = false,
  pagination,
  onRowClick,
  renderMobileCard,
  emptyMessage = 'Nenhum dado encontrado',
  stickyHeader = true,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const handleRowExpand = (index: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

  // Filtrar colunas para mobile baseado na prioridade
  const getVisibleColumns = () => {
    if (!isMobile) return columns;
    
    return columns
      .filter(col => !col.hideOnMobile)
      .sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        const aPriority = priorityOrder[a.priority || 'medium'];
        const bPriority = priorityOrder[b.priority || 'medium'];
        return aPriority - bPriority;
      })
      .slice(0, 2); // Mostrar apenas 2 colunas principais em mobile
  };

  const getHiddenColumns = () => {
    if (!isMobile) return [];
    return columns.filter(col => col.hideOnMobile || !getVisibleColumns().includes(col));
  };

  const renderLoadingSkeleton = () => {
    if (!isMobile) {
      return (
        <TableContainer component={Paper} sx={{ borderRadius: { xs: 16, sm: 12 } }}>
          <Table stickyHeader={stickyHeader}>
            <TableHead>
              <TableRow>
                {columns.map((column) => (
                  <TableCell key={column.id}>
                    <Skeleton variant="text" width="80%" />
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {[...Array(5)].map((_, index) => (
                <TableRow key={index}>
                  {columns.map((column) => (
                    <TableCell key={column.id}>
                      <Skeleton variant="text" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      );
    }

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {[...Array(5)].map((_, index) => (
          <Card key={index} sx={{ borderRadius: 16 }}>
            <CardContent sx={{ p: 2 }}>
              <Skeleton variant="text" width="60%" height={24} sx={{ mb: 1 }} />
              <Skeleton variant="text" width="40%" height={20} sx={{ mb: 1 }} />
              <Skeleton variant="text" width="80%" height={16} />
            </CardContent>
          </Card>
        ))}
      </Box>
    );
  };

  const renderMobileView = () => {
    if (renderMobileCard) {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {rows.map((row, index) => renderMobileCard(row, index))}
        </Box>
      );
    }

    const visibleColumns = getVisibleColumns();
    const hiddenColumns = getHiddenColumns();

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {rows.map((row, index) => {
          const isExpanded = expandedRows.has(index);
          
          return (
            <Card 
              key={index} 
              sx={{
                borderRadius: 16,
                cursor: onRowClick ? 'pointer' : 'default',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  boxShadow: theme.shadows[4],
                  transform: 'translateY(-2px)',
                },
                '&:active': {
                  transform: 'scale(0.98)',
                },
              }}
              onClick={() => onRowClick?.(row)}
            >
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box sx={{ flex: 1 }}>
                    {visibleColumns.map((column, colIndex) => {
                      const value = row[column.id];
                      const formattedValue = column.format ? column.format(value) : value;
                      
                      return (
                        <Box key={column.id} sx={{ mb: colIndex < visibleColumns.length - 1 ? 1 : 0 }}>
                          <Typography 
                            variant="caption" 
                            color="text.secondary"
                            sx={{ 
                              fontSize: '0.7rem',
                              fontWeight: 500,
                              textTransform: 'uppercase',
                              letterSpacing: 0.5,
                            }}
                          >
                            {column.label}
                          </Typography>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              fontSize: '0.875rem',
                              fontWeight: colIndex === 0 ? 600 : 400,
                              color: colIndex === 0 ? 'text.primary' : 'text.secondary',
                            }}
                          >
                            {typeof formattedValue === 'string' && formattedValue.length > 50 
                              ? `${formattedValue.substring(0, 50)}...` 
                              : formattedValue
                            }
                          </Typography>
                        </Box>
                      );
                    })}
                  </Box>
                  
                  {hiddenColumns.length > 0 && (
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRowExpand(index);
                      }}
                      sx={{
                        minWidth: 44,
                        minHeight: 44,
                        ml: 1,
                      }}
                    >
                      {isExpanded ? <ExpandLess /> : <ExpandMore />}
                    </IconButton>
                  )}
                </Box>
                
                {hiddenColumns.length > 0 && (
                  <Collapse in={isExpanded}>
                    <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
                      {hiddenColumns.map((column) => {
                        const value = row[column.id];
                        const formattedValue = column.format ? column.format(value) : value;
                        
                        return (
                          <Box key={column.id} sx={{ mb: 1 }}>
                            <Typography 
                              variant="caption" 
                              color="text.secondary"
                              sx={{ 
                                fontSize: '0.7rem',
                                fontWeight: 500,
                                textTransform: 'uppercase',
                                letterSpacing: 0.5,
                              }}
                            >
                              {column.label}
                            </Typography>
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                fontSize: '0.875rem',
                                color: 'text.secondary',
                              }}
                            >
                              {formattedValue}
                            </Typography>
                          </Box>
                        );
                      })}
                    </Box>
                  </Collapse>
                )}
              </CardContent>
            </Card>
          );
        })}
      </Box>
    );
  };

  const renderDesktopView = () => {
    return (
      <TableContainer 
        component={Paper} 
        sx={{ 
          borderRadius: { xs: 16, sm: 12 },
          maxHeight: { xs: 400, sm: 600 },
        }}
      >
        <Table stickyHeader={stickyHeader}>
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={column.id}
                  align={column.align}
                  style={{ minWidth: column.minWidth }}
                  sx={{
                    fontWeight: 600,
                    backgroundColor: alpha(theme.palette.primary.main, 0.04),
                    borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                  }}
                >
                  {column.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow 
                hover 
                key={index}
                onClick={() => onRowClick?.(row)}
                sx={{
                  cursor: onRowClick ? 'pointer' : 'default',
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.04),
                  },
                }}
              >
                {columns.map((column) => {
                  const value = row[column.id];
                  const formattedValue = column.format ? column.format(value) : value;
                  
                  return (
                    <TableCell key={column.id} align={column.align}>
                      {formattedValue}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  if (loading) {
    return renderLoadingSkeleton();
  }

  if (rows.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          py: 8,
          textAlign: 'center',
        }}
      >
        <Typography variant="h6" color="text.secondary" gutterBottom>
          {emptyMessage}
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {isMobile ? renderMobileView() : renderDesktopView()}
      
      {pagination && (
        <TablePagination
          component="div"
          count={pagination.count}
          page={pagination.page}
          onPageChange={pagination.onPageChange}
          rowsPerPage={pagination.rowsPerPage}
          onRowsPerPageChange={pagination.onRowsPerPageChange}
          labelRowsPerPage={isMobile ? "Por página:" : "Linhas por página:"}
          labelDisplayedRows={({ from, to, count }) => 
            isMobile 
              ? `${from}-${to} de ${count}`
              : `${from}-${to} de ${count !== -1 ? count : `mais de ${to}`}`
          }
          sx={{
            borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            mt: 2,
            '& .MuiTablePagination-toolbar': {
              px: { xs: 1, sm: 2 },
              minHeight: { xs: 52, sm: 64 },
            },
            '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
              fontSize: { xs: '0.8rem', sm: '0.875rem' },
            },
            '& .MuiIconButton-root': {
              minWidth: { xs: 40, sm: 48 },
              minHeight: { xs: 40, sm: 48 },
            },
          }}
        />
      )}
    </Box>
  );
};

export default MobileOptimizedTable;