import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../ui';
import { BarChart3, LineChart as LineChartIcon, PieChart as PieChartIcon, Table, Target } from 'lucide-react';

interface VisualizationConfig {
  type: 'table' | 'bar' | 'line' | 'pie' | 'metric';
  xAxis?: string;
  yAxis?: string;
  groupBy?: string;
  title?: string;
  subtitle?: string;
  showLegend?: boolean;
  showGrid?: boolean;
  colors?: string[];
  width?: number;
  height?: number;
  responsive?: boolean;
  animation?: boolean;
  dataLabels?: boolean;
}

interface BuilderField {
  id: string;
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  label: string;
  aggregation?: string;
  format?: string;
}

interface ReportVisualizationProps {
  data: any[];
  fields: BuilderField[];
  visualization: VisualizationConfig;
  className?: string;
}

const DEFAULT_COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
  '#06B6D4', '#F97316', '#84CC16', '#EC4899', '#6366F1'
];

const formatValue = (value: any, field?: BuilderField): string => {
  if (value === null || value === undefined) return '-';
  
  if (field?.type === 'number') {
    if (field.format === 'currency') {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(value);
    }
    if (field.format === 'percentage') {
      return `${(value * 100).toFixed(1)}%`;
    }
    return new Intl.NumberFormat('pt-BR').format(value);
  }
  
  if (field?.type === 'date') {
    return new Date(value).toLocaleDateString('pt-BR');
  }
  
  if (field?.type === 'boolean') {
    return value ? 'Sim' : 'Não';
  }
  
  return String(value);
};

const aggregateData = (data: any[], field: BuilderField): number => {
  const values = data.map(item => item[field.name]).filter(val => val !== null && val !== undefined);
  
  switch (field.aggregation) {
    case 'sum':
      return values.reduce((acc, val) => acc + Number(val), 0);
    case 'avg':
      return values.length > 0 ? values.reduce((acc, val) => acc + Number(val), 0) / values.length : 0;
    case 'min':
      return Math.min(...values.map(Number));
    case 'max':
      return Math.max(...values.map(Number));
    case 'count':
      return values.length;
    default:
      return values.length > 0 ? Number(values[0]) : 0;
  }
};

const TableVisualization: React.FC<{ data: any[]; fields: BuilderField[] }> = ({ data, fields }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse border border-gray-300">
        <thead>
          <tr className="bg-gray-50">
            {fields.map((field) => (
              <th key={field.id} className="border border-gray-300 px-4 py-2 text-left font-medium">
                {field.label}
                {field.aggregation && (
                  <span className="ml-1 text-xs text-gray-500">({field.aggregation.toUpperCase()})</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              {fields.map((field) => (
                <td key={field.id} className="border border-gray-300 px-4 py-2">
                  {formatValue(row[field.name], field)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          Nenhum dado disponível
        </div>
      )}
    </div>
  );
};

const MetricVisualization: React.FC<{ data: any[]; fields: BuilderField[] }> = ({ data, fields }) => {
  const metrics = useMemo(() => {
    return fields.map(field => {
      const value = field.aggregation ? aggregateData(data, field) : data.length > 0 ? data[0][field.name] : 0;
      return {
        label: field.label,
        value: formatValue(value, field),
        rawValue: value,
        field
      };
    });
  }, [data, fields]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {metrics.map((metric, index) => (
        <Card key={index}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{metric.label}</p>
                <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Target className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

const BarVisualization: React.FC<{
  data: any[];
  config: VisualizationConfig;
  fields: BuilderField[];
}> = ({ data, config, fields }) => {
  const chartData = useMemo(() => {
    if (!config.xAxis || !config.yAxis) return [];
    
    return data.map(item => ({
      name: formatValue(item[config.xAxis!]),
      value: Number(item[config.yAxis!]) || 0,
      ...item
    }));
  }, [data, config.xAxis, config.yAxis]);

  const colors = config.colors || DEFAULT_COLORS;

  return (
    <ResponsiveContainer width="100%" height={config.height || 400}>
      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        {config.showGrid && <CartesianGrid strokeDasharray="3 3" />}
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip formatter={(value: any, name: string) => [formatValue(value), name]} />
        {config.showLegend && <Legend />}
        <Bar dataKey="value" fill={colors[0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};

const LineVisualization: React.FC<{
  data: any[];
  config: VisualizationConfig;
  fields: BuilderField[];
}> = ({ data, config, fields }) => {
  const chartData = useMemo(() => {
    if (!config.xAxis || !config.yAxis) return [];
    
    return data.map(item => ({
      name: formatValue(item[config.xAxis!]),
      value: Number(item[config.yAxis!]) || 0,
      ...item
    }));
  }, [data, config.xAxis, config.yAxis]);

  const colors = config.colors || DEFAULT_COLORS;

  return (
    <ResponsiveContainer width="100%" height={config.height || 400}>
      <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        {config.showGrid && <CartesianGrid strokeDasharray="3 3" />}
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip formatter={(value: any, name: string) => [formatValue(value), name]} />
        {config.showLegend && <Legend />}
        <Line 
          type="monotone" 
          dataKey="value" 
          stroke={colors[0]} 
          strokeWidth={2}
          dot={{ fill: colors[0], strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

const PieVisualization: React.FC<{
  data: any[];
  config: VisualizationConfig;
  fields: BuilderField[];
}> = ({ data, config, fields }) => {
  const chartData = useMemo(() => {
    if (!config.groupBy) return [];
    
    const grouped = data.reduce((acc, item) => {
      const key = item[config.groupBy!];
      if (!acc[key]) {
        acc[key] = { name: formatValue(key), value: 0, count: 0 };
      }
      acc[key].count += 1;
      
      // Se há um campo Y definido, somar os valores
      if (config.yAxis) {
        acc[key].value += Number(item[config.yAxis]) || 0;
      } else {
        acc[key].value = acc[key].count;
      }
      
      return acc;
    }, {} as Record<string, any>);
    
    return Object.values(grouped);
  }, [data, config.groupBy, config.yAxis]);

  const colors = config.colors || DEFAULT_COLORS;

  return (
    <ResponsiveContainer width="100%" height={config.height || 400}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
          outerRadius={120}
          fill="#8884d8"
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value: any, name: string) => [formatValue(value), name]} />
        {config.showLegend && <Legend />}
      </PieChart>
    </ResponsiveContainer>
  );
};

const getVisualizationIcon = (type: string) => {
  switch (type) {
    case 'bar':
      return BarChart3;
    case 'line':
      return LineChartIcon;
    case 'pie':
      return PieChartIcon;
    case 'metric':
      return Target;
    case 'table':
    default:
      return Table;
  }
};

export const ReportVisualization: React.FC<ReportVisualizationProps> = ({
  data,
  fields,
  visualization,
  className = ''
}) => {
  const Icon = getVisualizationIcon(visualization.type);

  const renderVisualization = () => {
    switch (visualization.type) {
      case 'table':
        return <TableVisualization data={data} fields={fields} />;
      case 'bar':
        return <BarVisualization data={data} config={visualization} fields={fields} />;
      case 'line':
        return <LineVisualization data={data} config={visualization} fields={fields} />;
      case 'pie':
        return <PieVisualization data={data} config={visualization} fields={fields} />;
      case 'metric':
        return <MetricVisualization data={data} fields={fields} />;
      default:
        return (
          <div className="text-center text-gray-500 py-12">
            <Icon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>Tipo de visualização não suportado: {visualization.type}</p>
          </div>
        );
    }
  };

  if (data.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-12">
          <div className="text-center text-gray-500">
            <Icon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium mb-2">Nenhum dado disponível</p>
            <p className="text-sm">Configure os campos e filtros para visualizar os dados</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      {(visualization.title || visualization.subtitle) && (
        <CardHeader>
          {visualization.title && (
            <CardTitle className="flex items-center gap-2">
              <Icon className="h-5 w-5" />
              {visualization.title}
            </CardTitle>
          )}
          {visualization.subtitle && (
            <p className="text-sm text-gray-600">{visualization.subtitle}</p>
          )}
        </CardHeader>
      )}
      <CardContent className={visualization.type === 'table' ? 'p-0' : 'p-6'}>
        {renderVisualization()}
      </CardContent>
    </Card>
  );
};

export default ReportVisualization;