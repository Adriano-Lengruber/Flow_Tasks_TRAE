import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/Tabs';
import { 
  Users, 
  MessageCircle, 
  Share2, 
  Video, 
  Mic, 
  MicOff, 
  VideoOff,
  Settings,
  UserPlus,
  Bell,
  Eye,
  Edit3,
  Clock,
  Send
} from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  role: 'owner' | 'editor' | 'viewer';
  lastSeen?: Date;
  cursor?: {
    x: number;
    y: number;
    color: string;
  };
}

interface Message {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: Date;
  type: 'text' | 'system' | 'mention';
  replyTo?: string;
}

interface Activity {
  id: string;
  userId: string;
  userName: string;
  action: string;
  target: string;
  timestamp: Date;
  details?: any;
}

interface CollaborationPanelProps {
  projectId: string;
  currentUser: User;
  onInviteUser?: (email: string, role: string) => void;
  onStartVideoCall?: () => void;
  onShareScreen?: () => void;
}

export const CollaborationPanel: React.FC<CollaborationPanelProps> = ({
  projectId,
  currentUser,
  onInviteUser,
  onStartVideoCall,
  onShareScreen,
}) => {
  const [activeUsers, setActiveUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [isVideoCallActive, setIsVideoCallActive] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  // Simular dados iniciais
  useEffect(() => {
    const mockUsers: User[] = [
      {
        id: '1',
        name: 'Ana Silva',
        email: 'ana@empresa.com',
        status: 'online',
        role: 'owner',
        cursor: { x: 150, y: 200, color: '#3B82F6' }
      },
      {
        id: '2',
        name: 'Carlos Santos',
        email: 'carlos@empresa.com',
        status: 'online',
        role: 'editor',
        cursor: { x: 300, y: 150, color: '#10B981' }
      },
      {
        id: '3',
        name: 'Maria Costa',
        email: 'maria@empresa.com',
        status: 'away',
        role: 'viewer',
        lastSeen: new Date(Date.now() - 5 * 60 * 1000)
      }
    ];

    const mockMessages: Message[] = [
      {
        id: '1',
        userId: '1',
        userName: 'Ana Silva',
        content: 'Pessoal, vamos revisar os relatórios de vendas?',
        timestamp: new Date(Date.now() - 10 * 60 * 1000),
        type: 'text'
      },
      {
        id: '2',
        userId: '2',
        userName: 'Carlos Santos',
        content: 'Perfeito! Já atualizei os dados do Q4.',
        timestamp: new Date(Date.now() - 8 * 60 * 1000),
        type: 'text'
      },
      {
        id: '3',
        userId: 'system',
        userName: 'Sistema',
        content: 'Maria Costa entrou na sessão',
        timestamp: new Date(Date.now() - 5 * 60 * 1000),
        type: 'system'
      }
    ];

    const mockActivities: Activity[] = [
      {
        id: '1',
        userId: '1',
        userName: 'Ana Silva',
        action: 'editou',
        target: 'Relatório de Vendas Q4',
        timestamp: new Date(Date.now() - 15 * 60 * 1000)
      },
      {
        id: '2',
        userId: '2',
        userName: 'Carlos Santos',
        action: 'comentou em',
        target: 'Dashboard Principal',
        timestamp: new Date(Date.now() - 20 * 60 * 1000)
      },
      {
        id: '3',
        userId: '3',
        userName: 'Maria Costa',
        action: 'visualizou',
        target: 'Análise de Performance',
        timestamp: new Date(Date.now() - 25 * 60 * 1000)
      }
    ];

    setActiveUsers(mockUsers);
    setMessages(mockMessages);
    setActivities(mockActivities);
  }, []);

  // Auto-scroll para última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const message: Message = {
      id: Date.now().toString(),
      userId: currentUser.id,
      userName: currentUser.name,
      content: newMessage,
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');
    chatInputRef.current?.focus();
  };

  const handleInviteUser = () => {
    if (!inviteEmail.trim()) return;

    onInviteUser?.(inviteEmail, inviteRole);
    setInviteEmail('');
    setShowInviteModal(false);

    // Simular adição do usuário
    const newUser: User = {
      id: Date.now().toString(),
      name: inviteEmail.split('@')[0],
      email: inviteEmail,
      status: 'offline',
      role: inviteRole as any
    };

    setActiveUsers(prev => [...prev, newUser]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'busy': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-purple-100 text-purple-800';
      case 'editor': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'agora';
    if (minutes < 60) return `${minutes}m atrás`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h atrás`;
    
    const days = Math.floor(hours / 24);
    return `${days}d atrás`;
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Colaboração
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowInviteModal(true)}
            >
              <UserPlus className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onStartVideoCall}
            >
              <Video className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        <Tabs defaultValue="chat" className="flex-1 flex flex-col">
          <TabsList className="mx-4 mb-2">
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Usuários ({activeUsers.length})
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Atividade
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="flex-1 flex flex-col mx-4 mt-0">
            {/* Área de mensagens */}
            <div className="flex-1 overflow-y-auto space-y-3 mb-4 max-h-96">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex flex-col ${
                    message.type === 'system' ? 'items-center' : 'items-start'
                  }`}
                >
                  {message.type === 'system' ? (
                    <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {message.content}
                    </div>
                  ) : (
                    <div className="w-full">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">
                          {message.userName}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatTime(message.timestamp)}
                        </span>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3 text-sm">
                        {message.content}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input de mensagem */}
            <div className="flex gap-2">
              <Input
                ref={chatInputRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Digite sua mensagem..."
                className="flex-1"
              />
              <Button onClick={handleSendMessage} size="sm">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="users" className="flex-1 mx-4 mt-0">
            <div className="space-y-3">
              {activeUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                        getStatusColor(user.status)
                      }`} />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{user.name}</div>
                      <div className="text-xs text-gray-500">
                        {user.status === 'offline' && user.lastSeen
                          ? `Visto ${formatRelativeTime(user.lastSeen)}`
                          : user.status
                        }
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getRoleColor(user.role)}>
                      {user.role}
                    </Badge>
                    {user.status === 'online' && (
                      <div className="flex items-center gap-1">
                        {user.role !== 'viewer' && <Edit3 className="h-3 w-3 text-green-500" />}
                        <Eye className="h-3 w-3 text-blue-500" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="activity" className="flex-1 mx-4 mt-0">
            <div className="space-y-3">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                    <Clock className="h-3 w-3 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm">
                      <span className="font-medium">{activity.userName}</span>
                      {' '}
                      <span className="text-gray-600">{activity.action}</span>
                      {' '}
                      <span className="font-medium">{activity.target}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {formatRelativeTime(activity.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Modal de convite */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Convidar Colaborador</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <Input
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Função</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="viewer">Visualizador</option>
                  <option value="editor">Editor</option>
                  <option value="owner">Proprietário</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowInviteModal(false)}
              >
                Cancelar
              </Button>
              <Button onClick={handleInviteUser}>
                Enviar Convite
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Indicador de chamada de vídeo */}
      {isVideoCallActive && (
        <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-2 rounded-lg flex items-center gap-2">
          <Video className="h-4 w-4" />
          <span className="text-sm">Chamada ativa</span>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 text-white hover:bg-green-600"
              onClick={() => setIsMicMuted(!isMicMuted)}
            >
              {isMicMuted ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 text-white hover:bg-green-600"
              onClick={() => setIsVideoOff(!isVideoOff)}
            >
              {isVideoOff ? <VideoOff className="h-3 w-3" /> : <Video className="h-3 w-3" />}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};

export default CollaborationPanel;