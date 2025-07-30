import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Separator,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  Switch,
  Label,
  ScrollArea,
  Popover,
  PopoverContent,
  PopoverTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui';
import {
  Users,
  MessageSquare,
  Share2,
  UserPlus,
  Crown,
  Eye,
  Edit,
  Lock,
  Unlock,
  Clock,
  Send,
  MoreHorizontal,
  Bell,
  BellOff,
  Copy,
  Link,
  Mail,
  Download,
  History,
  Activity,
  CheckCircle,
  AlertCircle,
  Info,
  X,
  Plus,
  Settings,
  Shield,
  Globe,
  Building,
  User,
  Calendar,
  Filter,
  Search,
  RefreshCw,
  Zap,
  Star,
  Heart,
  MessageCircle,
  Reply,
  ThumbsUp,
  ThumbsDown,
  Flag,
  Pin,
  Archive,
  Trash2,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'owner' | 'editor' | 'viewer';
  status: 'online' | 'offline' | 'away';
  lastSeen?: Date;
  permissions: string[];
}

interface Comment {
  id: string;
  userId: string;
  user: User;
  content: string;
  createdAt: Date;
  updatedAt?: Date;
  replies?: Comment[];
  reactions: { emoji: string; users: string[]; count: number }[];
  isPinned?: boolean;
  isResolved?: boolean;
  attachments?: { id: string; name: string; url: string; type: string }[];
  mentions?: string[];
  tags?: string[];
}

interface Activity {
  id: string;
  userId: string;
  user: User;
  type: 'edit' | 'comment' | 'share' | 'export' | 'permission_change' | 'template_change';
  description: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

interface ShareSettings {
  isPublic: boolean;
  allowComments: boolean;
  allowExport: boolean;
  expiresAt?: Date;
  password?: string;
  domains?: string[];
}

interface CollaborationPanelProps {
  reportId: string;
  currentUser: User;
  isVisible: boolean;
  onToggle: () => void;
  readOnly?: boolean;
}

const PERMISSION_LEVELS = {
  owner: {
    name: 'Proprietário',
    description: 'Controle total sobre o relatório',
    icon: Crown,
    color: 'text-yellow-600',
    permissions: ['read', 'write', 'delete', 'share', 'manage_permissions'],
  },
  editor: {
    name: 'Editor',
    description: 'Pode editar e comentar',
    icon: Edit,
    color: 'text-blue-600',
    permissions: ['read', 'write', 'comment'],
  },
  viewer: {
    name: 'Visualizador',
    description: 'Apenas visualização e comentários',
    icon: Eye,
    color: 'text-green-600',
    permissions: ['read', 'comment'],
  },
};

const ACTIVITY_ICONS = {
  edit: Edit,
  comment: MessageSquare,
  share: Share2,
  export: Download,
  permission_change: Shield,
  template_change: Settings,
};

const REACTION_EMOJIS = ['👍', '👎', '❤️', '😊', '😮', '😢', '😡', '🎉'];

export const CollaborationPanel: React.FC<CollaborationPanelProps> = ({
  reportId,
  currentUser,
  isVisible,
  onToggle,
  readOnly = false,
}) => {
  const [activeTab, setActiveTab] = useState<'collaborators' | 'comments' | 'activity' | 'share'>('collaborators');
  const [collaborators, setCollaborators] = useState<User[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [shareSettings, setShareSettings] = useState<ShareSettings>({
    isPublic: false,
    allowComments: true,
    allowExport: false,
  });
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('viewer');
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'unresolved' | 'pinned'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [notifications, setNotifications] = useState(true);

  // Simulated data - in real app, this would come from API/WebSocket
  useEffect(() => {
    // Load initial data
    setCollaborators([
      {
        id: '1',
        name: 'João Silva',
        email: 'joao@empresa.com',
        avatar: '/avatars/joao.jpg',
        role: 'owner',
        status: 'online',
        permissions: PERMISSION_LEVELS.owner.permissions,
      },
      {
        id: '2',
        name: 'Maria Santos',
        email: 'maria@empresa.com',
        avatar: '/avatars/maria.jpg',
        role: 'editor',
        status: 'online',
        permissions: PERMISSION_LEVELS.editor.permissions,
      },
      {
        id: '3',
        name: 'Pedro Costa',
        email: 'pedro@empresa.com',
        role: 'viewer',
        status: 'away',
        lastSeen: new Date(Date.now() - 30 * 60 * 1000),
        permissions: PERMISSION_LEVELS.viewer.permissions,
      },
    ]);

    setComments([
      {
        id: '1',
        userId: '2',
        user: {
          id: '2',
          name: 'Maria Santos',
          email: 'maria@empresa.com',
          avatar: '/avatars/maria.jpg',
          role: 'editor',
          status: 'online',
          permissions: [],
        },
        content: 'Os dados de vendas do Q4 parecem estar inconsistentes. Podemos verificar?',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        reactions: [
          { emoji: '👍', users: ['1'], count: 1 },
          { emoji: '❤️', users: ['3'], count: 1 },
        ],
        isPinned: true,
        replies: [
          {
            id: '1-1',
            userId: '1',
            user: {
              id: '1',
              name: 'João Silva',
              email: 'joao@empresa.com',
              role: 'owner',
              status: 'online',
              permissions: [],
            },
            content: 'Boa observação! Vou verificar com o time de vendas.',
            createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
            reactions: [],
          },
        ],
      },
      {
        id: '2',
        userId: '3',
        user: {
          id: '3',
          name: 'Pedro Costa',
          email: 'pedro@empresa.com',
          role: 'viewer',
          status: 'away',
          permissions: [],
        },
        content: 'Seria interessante adicionar um filtro por região.',
        createdAt: new Date(Date.now() - 30 * 60 * 1000),
        reactions: [],
      },
    ]);

    setActivities([
      {
        id: '1',
        userId: '2',
        user: {
          id: '2',
          name: 'Maria Santos',
          email: 'maria@empresa.com',
          role: 'editor',
          status: 'online',
          permissions: [],
        },
        type: 'edit',
        description: 'Atualizou os filtros do relatório',
        timestamp: new Date(Date.now() - 15 * 60 * 1000),
      },
      {
        id: '2',
        userId: '1',
        user: {
          id: '1',
          name: 'João Silva',
          email: 'joao@empresa.com',
          role: 'owner',
          status: 'online',
          permissions: [],
        },
        type: 'share',
        description: 'Compartilhou o relatório com Pedro Costa',
        timestamp: new Date(Date.now() - 45 * 60 * 1000),
      },
    ]);
  }, [reportId]);

  // Filter comments based on search and filter type
  const filteredComments = useMemo(() => {
    let filtered = comments;

    if (searchQuery) {
      filtered = filtered.filter(comment =>
        comment.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        comment.user.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    switch (filterType) {
      case 'unresolved':
        filtered = filtered.filter(comment => !comment.isResolved);
        break;
      case 'pinned':
        filtered = filtered.filter(comment => comment.isPinned);
        break;
    }

    return filtered;
  }, [comments, searchQuery, filterType]);

  const handleInviteUser = async () => {
    if (!inviteEmail) {
      toast.error('Digite um email válido');
      return;
    }

    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newUser: User = {
        id: Date.now().toString(),
        name: inviteEmail.split('@')[0],
        email: inviteEmail,
        role: inviteRole,
        status: 'offline',
        permissions: PERMISSION_LEVELS[inviteRole].permissions,
      };
      
      setCollaborators(prev => [...prev, newUser]);
      setInviteEmail('');
      setShowInviteDialog(false);
      toast.success(`Convite enviado para ${inviteEmail}`);
    } catch (error) {
      toast.error('Erro ao enviar convite');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    const comment: Comment = {
      id: Date.now().toString(),
      userId: currentUser.id,
      user: currentUser,
      content: newComment,
      createdAt: new Date(),
      reactions: [],
    };

    if (replyingTo) {
      setComments(prev => prev.map(c => {
        if (c.id === replyingTo) {
          return {
            ...c,
            replies: [...(c.replies || []), comment],
          };
        }
        return c;
      }));
      setReplyingTo(null);
    } else {
      setComments(prev => [comment, ...prev]);
    }

    setNewComment('');
    toast.success('Comentário adicionado');
  };

  const handleReaction = (commentId: string, emoji: string) => {
    setComments(prev => prev.map(comment => {
      if (comment.id === commentId) {
        const existingReaction = comment.reactions.find(r => r.emoji === emoji);
        if (existingReaction) {
          const hasUserReacted = existingReaction.users.includes(currentUser.id);
          if (hasUserReacted) {
            // Remove reaction
            return {
              ...comment,
              reactions: comment.reactions.map(r => 
                r.emoji === emoji
                  ? {
                      ...r,
                      users: r.users.filter(id => id !== currentUser.id),
                      count: r.count - 1,
                    }
                  : r
              ).filter(r => r.count > 0),
            };
          } else {
            // Add reaction
            return {
              ...comment,
              reactions: comment.reactions.map(r => 
                r.emoji === emoji
                  ? {
                      ...r,
                      users: [...r.users, currentUser.id],
                      count: r.count + 1,
                    }
                  : r
              ),
            };
          }
        } else {
          // New reaction
          return {
            ...comment,
            reactions: [
              ...comment.reactions,
              { emoji, users: [currentUser.id], count: 1 },
            ],
          };
        }
      }
      return comment;
    }));
  };

  const handleChangeRole = (userId: string, newRole: 'owner' | 'editor' | 'viewer') => {
    setCollaborators(prev => prev.map(user => 
      user.id === userId
        ? { ...user, role: newRole, permissions: PERMISSION_LEVELS[newRole].permissions }
        : user
    ));
    toast.success('Permissões atualizadas');
  };

  const handleRemoveCollaborator = (userId: string) => {
    setCollaborators(prev => prev.filter(user => user.id !== userId));
    toast.success('Colaborador removido');
  };

  const generateShareLink = () => {
    const link = `${window.location.origin}/reports/${reportId}/shared`;
    navigator.clipboard.writeText(link);
    toast.success('Link copiado para a área de transferência');
  };

  const getStatusColor = (status: User['status']) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'offline': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  const getStatusText = (user: User) => {
    if (user.status === 'online') return 'Online';
    if (user.status === 'away') return 'Ausente';
    if (user.lastSeen) {
      return `Visto ${formatDistanceToNow(user.lastSeen, { locale: ptBR, addSuffix: true })}`;
    }
    return 'Offline';
  };

  if (!isVisible) return null;

  return (
    <TooltipProvider>
      <Card className="w-80 h-full flex flex-col border-l">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5" />
              Colaboração
            </CardTitle>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setNotifications(!notifications)}
                  >
                    {notifications ? (
                      <Bell className="h-4 w-4" />
                    ) : (
                      <BellOff className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {notifications ? 'Desativar notificações' : 'Ativar notificações'}
                </TooltipContent>
              </Tooltip>
              <Button variant="ghost" size="sm" onClick={onToggle}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
            {[
              { id: 'collaborators', label: 'Pessoas', icon: Users },
              { id: 'comments', label: 'Comentários', icon: MessageSquare },
              { id: 'activity', label: 'Atividade', icon: Activity },
              { id: 'share', label: 'Compartilhar', icon: Share2 },
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.id ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setActiveTab(tab.id as any)}
                  className="flex-1 h-8 text-xs"
                >
                  <Icon className="h-3 w-3 mr-1" />
                  {tab.label}
                </Button>
              );
            })}
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-full px-4">
            {/* Collaborators Tab */}
            {activeTab === 'collaborators' && (
              <div className="space-y-4 pb-4">
                {/* Add Collaborator */}
                <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
                  <DialogTrigger asChild>
                    <Button className="w-full" disabled={readOnly}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Convidar Pessoa
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Convidar Colaborador</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Email</Label>
                        <Input
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          placeholder="email@exemplo.com"
                          type="email"
                        />
                      </div>
                      <div>
                        <Label>Permissão</Label>
                        <Select value={inviteRole} onValueChange={(value: any) => setInviteRole(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="viewer">Visualizador</SelectItem>
                            <SelectItem value="editor">Editor</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleInviteUser} disabled={isLoading}>
                        {isLoading ? 'Enviando...' : 'Enviar Convite'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Collaborators List */}
                <div className="space-y-3">
                  {collaborators.map((user) => {
                    const roleInfo = PERMISSION_LEVELS[user.role];
                    const RoleIcon = roleInfo.icon;
                    
                    return (
                      <div key={user.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                        <div className="relative">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatar} alt={user.name} />
                            <AvatarFallback className="text-xs">
                              {user.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(user.status)}`} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {user.name}
                            </p>
                            <RoleIcon className={`h-3 w-3 ${roleInfo.color}`} />
                          </div>
                          <p className="text-xs text-gray-500 truncate">
                            {getStatusText(user)}
                          </p>
                        </div>
                        
                        {user.id !== currentUser.id && !readOnly && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleChangeRole(user.id, 'viewer')}>
                                <Eye className="h-4 w-4 mr-2" />
                                Tornar Visualizador
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleChangeRole(user.id, 'editor')}>
                                <Edit className="h-4 w-4 mr-2" />
                                Tornar Editor
                              </DropdownMenuItem>
                              {currentUser.role === 'owner' && (
                                <DropdownMenuItem onClick={() => handleChangeRole(user.id, 'owner')}>
                                  <Crown className="h-4 w-4 mr-2" />
                                  Tornar Proprietário
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleRemoveCollaborator(user.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Remover
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Comments Tab */}
            {activeTab === 'comments' && (
              <div className="space-y-4 pb-4">
                {/* Search and Filter */}
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar comentários..."
                      className="pl-10"
                    />
                  </div>
                  <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os comentários</SelectItem>
                      <SelectItem value="unresolved">Não resolvidos</SelectItem>
                      <SelectItem value="pinned">Fixados</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Add Comment */}
                {!readOnly && (
                  <div className="space-y-2">
                    {replyingTo && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Reply className="h-4 w-4" />
                        Respondendo comentário
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setReplyingTo(null)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Avatar className="h-6 w-6 mt-1">
                        <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
                        <AvatarFallback className="text-xs">
                          {currentUser.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <Textarea
                          value={newComment}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewComment(e.target.value)}
                          placeholder="Adicionar comentário..."
                          className="min-h-[60px] resize-none"
                          onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                              handleAddComment();
                            }
                          }}
                        />
                        <div className="flex justify-between items-center mt-2">
                          <p className="text-xs text-gray-500">
                            Ctrl+Enter para enviar
                          </p>
                          <Button
                            size="sm"
                            onClick={handleAddComment}
                            disabled={!newComment.trim()}
                          >
                            <Send className="h-3 w-3 mr-1" />
                            Enviar
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Comments List */}
                <div className="space-y-4">
                  {filteredComments.map((comment) => (
                    <div key={comment.id} className="space-y-2">
                      <div className="flex gap-3">
                        <Avatar className="h-6 w-6 mt-1">
                          <AvatarImage src={comment.user.avatar} alt={comment.user.name} />
                          <AvatarFallback className="text-xs">
                            {comment.user.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 space-y-2">
                          <div className="bg-gray-50 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">
                                  {comment.user.name}
                                </span>
                                {comment.isPinned && (
                                  <Pin className="h-3 w-3 text-blue-600" />
                                )}
                                {comment.isResolved && (
                                  <CheckCircle className="h-3 w-3 text-green-600" />
                                )}
                              </div>
                              <span className="text-xs text-gray-500">
                                {formatDistanceToNow(comment.createdAt, { locale: ptBR, addSuffix: true })}
                              </span>
                            </div>
                            <p className="text-sm text-gray-900">{comment.content}</p>
                          </div>
                          
                          {/* Reactions */}
                          <div className="flex items-center gap-2">
                            {comment.reactions.map((reaction) => (
                              <Button
                                key={reaction.emoji}
                                variant="outline"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={() => handleReaction(comment.id, reaction.emoji)}
                              >
                                {reaction.emoji} {reaction.count}
                              </Button>
                            ))}
                            
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-6 px-2">
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-2">
                                <div className="flex gap-1">
                                  {REACTION_EMOJIS.map((emoji) => (
                                    <Button
                                      key={emoji}
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                      onClick={() => {
                                        handleReaction(comment.id, emoji);
                                      }}
                                    >
                                      {emoji}
                                    </Button>
                                  ))}
                                </div>
                              </PopoverContent>
                            </Popover>
                            
                            {!readOnly && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={() => setReplyingTo(comment.id)}
                              >
                                <Reply className="h-3 w-3 mr-1" />
                                Responder
                              </Button>
                            )}
                          </div>
                          
                          {/* Replies */}
                          {comment.replies && comment.replies.length > 0 && (
                            <div className="ml-4 space-y-2 border-l-2 border-gray-200 pl-4">
                              {comment.replies.map((reply) => (
                                <div key={reply.id} className="flex gap-2">
                                  <Avatar className="h-5 w-5 mt-1">
                                    <AvatarImage src={reply.user.avatar} alt={reply.user.name} />
                                    <AvatarFallback className="text-xs">
                                      {reply.user.name.split(' ').map(n => n[0]).join('')}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1">
                                    <div className="bg-white rounded-lg p-2 border">
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-medium">
                                          {reply.user.name}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                          {formatDistanceToNow(reply.createdAt, { locale: ptBR, addSuffix: true })}
                                        </span>
                                      </div>
                                      <p className="text-xs text-gray-900">{reply.content}</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {filteredComments.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">
                        {searchQuery || filterType !== 'all'
                          ? 'Nenhum comentário encontrado'
                          : 'Nenhum comentário ainda'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Activity Tab */}
            {activeTab === 'activity' && (
              <div className="space-y-4 pb-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Atividade Recente</h4>
                  <Button variant="ghost" size="sm">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {activities.map((activity) => {
                    const Icon = ACTIVITY_ICONS[activity.type];
                    
                    return (
                      <div key={activity.id} className="flex gap-3 p-2 rounded-lg hover:bg-gray-50">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <Icon className="h-4 w-4 text-blue-600" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900">
                            <span className="font-medium">{activity.user.name}</span>
                            {' '}{activity.description}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDistanceToNow(activity.timestamp, { locale: ptBR, addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Share Tab */}
            {activeTab === 'share' && (
              <div className="space-y-4 pb-4">
                <div className="space-y-4">
                  {/* Public Sharing */}
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          <span className="text-sm font-medium">Compartilhamento Público</span>
                        </div>
                        <Switch
                          checked={shareSettings.isPublic}
                          onCheckedChange={(checked: boolean) =>
                            setShareSettings(prev => ({ ...prev, isPublic: checked }))
                          }
                          disabled={readOnly}
                        />
                      </div>
                      
                      {shareSettings.isPublic && (
                        <div className="space-y-3">
                          <div className="flex gap-2">
                            <Input
                              value={`${window.location.origin}/reports/${reportId}/shared`}
                              readOnly
                              className="text-xs"
                            />
                            <Button size="sm" onClick={generateShareLink}>
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs">Permitir comentários</Label>
                              <Switch
                                checked={shareSettings.allowComments}
                                onCheckedChange={(checked: boolean) => 
                                  setShareSettings(prev => ({ ...prev, allowComments: checked }))
                                }
                                disabled={readOnly}
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <Label className="text-xs">Permitir exportação</Label>
                              <Switch
                                checked={shareSettings.allowExport}
                                onCheckedChange={(checked: boolean) =>
                                  setShareSettings(prev => ({ ...prev, allowExport: checked }))
                                }
                                disabled={readOnly}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  
                  {/* Quick Share Actions */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm">
                      <Mail className="h-4 w-4 mr-2" />
                      Email
                    </Button>
                    <Button variant="outline" size="sm">
                      <Link className="h-4 w-4 mr-2" />
                      Link
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

export default CollaborationPanel;