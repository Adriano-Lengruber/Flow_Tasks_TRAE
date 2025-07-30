import { gql } from '@apollo/client';

// Fragments
export const BUILDER_FIELD_FRAGMENT = gql`
  fragment BuilderFieldFragment on BuilderField {
    id
    name
    type
    source
    label
    description
    aggregations
    formats
  }
`;

export const DATA_SOURCE_FRAGMENT = gql`
  fragment DataSourceFragment on DataSource {
    id
    name
    type
    description
    fields {
      ...BuilderFieldFragment
    }
  }
  ${BUILDER_FIELD_FRAGMENT}
`;

export const TEMPLATE_FIELD_FRAGMENT = gql`
  fragment TemplateFieldFragment on TemplateField {
    id
    name
    type
    source
    label
    aggregation
    format
  }
`;

export const TEMPLATE_FILTER_FRAGMENT = gql`
  fragment TemplateFilterFragment on TemplateFilter {
    id
    fieldId
    operator
    value
    label
  }
`;

export const VISUALIZATION_CONFIG_FRAGMENT = gql`
  fragment VisualizationConfigFragment on VisualizationConfig {
    type
    xAxis
    yAxis
    groupBy
    title
    subtitle
    showLegend
    showGrid
    colors
    width
    height
    responsive
    animation
    dataLabels
  }
`;

export const REPORT_TEMPLATE_FRAGMENT = gql`
  fragment ReportTemplateFragment on ReportTemplate {
    id
    name
    description
    category
    fields {
      ...TemplateFieldFragment
    }
    filters {
      ...TemplateFilterFragment
    }
    visualization {
      ...VisualizationConfigFragment
    }
    isPublic
    tags
    createdAt
    updatedAt
    createdBy {
      id
      name
      email
    }
  }
  ${TEMPLATE_FIELD_FRAGMENT}
  ${TEMPLATE_FILTER_FRAGMENT}
  ${VISUALIZATION_CONFIG_FRAGMENT}
`;

export const PREBUILT_TEMPLATE_FRAGMENT = gql`
  fragment PrebuiltTemplateFragment on PrebuiltTemplate {
    id
    name
    description
    category
    thumbnail
    tags
    usageCount
    rating
    visualization {
      type
      config
    }
  }
`;

export const TEMPLATE_USAGE_STATS_FRAGMENT = gql`
  fragment TemplateUsageStatsFragment on TemplateUsageStats {
    totalUsage
    monthlyUsage
    weeklyUsage
    dailyUsage
    averageRating
    totalRatings
    popularFields
    commonFilters
    usageByCategory
    usageOverTime {
      date
      count
    }
  }
`;

// Queries
export const GET_DATA_SOURCES = gql`
  query GetDataSources {
    availableDataSources {
      ...DataSourceFragment
    }
  }
  ${DATA_SOURCE_FRAGMENT}
`;

export const GET_REPORT_TEMPLATES = gql`
  query GetReportTemplates(
    $search: TemplateSearchInput
    $limit: Int
    $offset: Int
  ) {
    reportTemplates(search: $search, limit: $limit, offset: $offset) {
      templates {
        ...ReportTemplateFragment
      }
      total
      hasMore
    }
  }
  ${REPORT_TEMPLATE_FRAGMENT}
`;

export const GET_REPORT_TEMPLATE = gql`
  query GetReportTemplate($id: ID!) {
    reportTemplate(id: $id) {
      ...ReportTemplate
    }
  }
`;

export const GET_PREBUILT_TEMPLATES = gql`
  query GetPrebuiltTemplates {
    prebuiltTemplates {
      ...PrebuiltTemplateFragment
    }
  }
  ${PREBUILT_TEMPLATE_FRAGMENT}
`;

export const GET_POPULAR_TEMPLATES = gql`
  query GetPopularTemplates($limit: Int = 10) {
    popularTemplates(limit: $limit) {
      ...ReportTemplateFragment
    }
  }
  ${REPORT_TEMPLATE_FRAGMENT}
`;

export const GET_TEMPLATE_USAGE_STATS = gql`
  query GetTemplateUsageStats($templateId: ID!) {
    templateUsageStats(templateId: $templateId) {
      ...TemplateUsageStatsFragment
    }
  }
  ${TEMPLATE_USAGE_STATS_FRAGMENT}
`;

export const VALIDATE_TEMPLATE = gql`
  query ValidateTemplate($template: TemplateValidationInput!) {
    validateTemplate(template: $template) {
      isValid
      errors {
        field
        message
        code
      }
      warnings {
        field
        message
        code
      }
    }
  }
`;

// Mutations
export const CREATE_TEMPLATE = gql`
  mutation CreateReportTemplate($input: CreateTemplateInput!) {
    createReportTemplate(input: $input) {
      ...ReportTemplateFragment
    }
  }
  ${REPORT_TEMPLATE_FRAGMENT}
`;

export const UPDATE_TEMPLATE = gql`
  mutation UpdateReportTemplate($id: ID!, $input: UpdateTemplateInput!) {
    updateReportTemplate(id: $id, input: $input) {
      ...ReportTemplateFragment
    }
  }
  ${REPORT_TEMPLATE_FRAGMENT}
`;

export const DELETE_TEMPLATE = gql`
  mutation DeleteReportTemplate($id: ID!) {
    deleteReportTemplate(id: $id) {
      success
      message
    }
  }
`;

export const CLONE_TEMPLATE = gql`
  mutation CloneReportTemplate($templateId: ID!, $name: String) {
    cloneReportTemplate(templateId: $templateId, name: $name) {
      ...ReportTemplateFragment
    }
  }
  ${REPORT_TEMPLATE_FRAGMENT}
`;

export const GENERATE_REPORT = gql`
  mutation GenerateReportFromTemplate($templateId: ID!, $options: ReportGenerationOptions) {
    generateReportFromTemplate(templateId: $templateId, options: $options) {
      id
      name
      status
      downloadUrl
      previewUrl
      createdAt
      expiresAt
    }
  }
`;

export const SHARE_TEMPLATE = gql`
  mutation ShareReportTemplate($templateId: ID!, $shareOptions: ShareTemplateInput!) {
    shareReportTemplate(templateId: $templateId, shareOptions: $shareOptions) {
      shareUrl
      shareCode
      expiresAt
      permissions
    }
  }
`;

export const RATE_TEMPLATE = gql`
  mutation RateReportTemplate($templateId: ID!, $rating: Int!, $comment: String) {
    rateReportTemplate(templateId: $templateId, rating: $rating, comment: $comment) {
      success
      averageRating
      totalRatings
    }
  }
`;

export const FAVORITE_TEMPLATE = gql`
  mutation FavoriteReportTemplate($templateId: ID!) {
    favoriteReportTemplate(templateId: $templateId) {
      success
      isFavorited
    }
  }
`;

export const DUPLICATE_TEMPLATE = gql`
  mutation DuplicateReportTemplate($templateId: ID!, $name: String!) {
    duplicateReportTemplate(templateId: $templateId, name: $name) {
      ...ReportTemplateFragment
    }
  }
  ${REPORT_TEMPLATE_FRAGMENT}
`;

export const EXPORT_TEMPLATE = gql`
  mutation ExportReportTemplate($templateId: ID!, $format: ExportFormat!) {
    exportReportTemplate(templateId: $templateId, format: $format) {
      downloadUrl
      filename
      size
      expiresAt
    }
  }
`;

export const IMPORT_TEMPLATE = gql`
  mutation ImportReportTemplate($file: Upload!, $options: ImportTemplateOptions) {
    importReportTemplate(file: $file, options: $options) {
      ...ReportTemplateFragment
    }
  }
  ${REPORT_TEMPLATE_FRAGMENT}
`;

// Subscriptions
export const TEMPLATE_UPDATED = gql`
  subscription TemplateUpdated($templateId: ID!) {
    templateUpdated(templateId: $templateId) {
      ...ReportTemplateFragment
    }
  }
  ${REPORT_TEMPLATE_FRAGMENT}
`;

export const TEMPLATE_USAGE_UPDATED = gql`
  subscription TemplateUsageUpdated($templateId: ID!) {
    templateUsageUpdated(templateId: $templateId) {
      ...TemplateUsageStatsFragment
    }
  }
  ${TEMPLATE_USAGE_STATS_FRAGMENT}
`;

export const REPORT_GENERATION_STATUS = gql`
  subscription ReportGenerationStatus($reportId: ID!) {
    reportGenerationStatus(reportId: $reportId) {
      id
      status
      progress
      message
      downloadUrl
      previewUrl
      error
    }
  }
`;

// Type definitions for TypeScript
export type FieldType = 'string' | 'number' | 'date' | 'boolean';
export type FilterOperator = 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'starts_with' | 'ends_with' | 'greater_than' | 'greater_than_or_equal' | 'less_than' | 'less_than_or_equal' | 'between' | 'in' | 'not_in' | 'is_null' | 'is_not_null';

export interface BuilderField {
  id: string;
  name: string;
  type: FieldType;
  source: string;
  label: string;
  description?: string;
  aggregations?: string[];
  formats?: string[];
  displayName?: string;
  category?: string;
}

export interface DataSource {
  id: string;
  name: string;
  type: string;
  description?: string;
  fields: BuilderField[];
}

export interface TemplateField {
  id: string;
  name: string;
  displayName?: string;
  type: FieldType;
  source: string;
  label: string;
  description?: string;
  aggregation: string;
  format?: string;
  visible: boolean;
  sortable: boolean;
  filterable: boolean;
  width: string;
}

export interface TemplateFilter {
  id: string;
  fieldId: string;
  field?: string; // Legacy support
  operator: FilterOperator;
  value: any;
  label: string;
  description?: string;
  required?: boolean;
  visible?: boolean;
  displayName?: string;
  allowMultiple?: boolean;
}

export type VisualizationType = 'table' | 'bar' | 'line' | 'pie' | 'metric';

export interface VisualizationConfig {
  // Base fields
  type: VisualizationType;
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
  theme?: string;
  dataLimit?: number;
  defaultSort?: string;
  // Pie specific
  categoryField?: string;
  valueField?: string;
  // Metric specific
  metricField?: string;
  // Table specific
  pagination?: { enabled: boolean; pageSize: number };
  sorting?: { enabled: boolean; defaultSort: string | null };
  striped?: boolean;
  bordered?: boolean;
  compact?: boolean;
  // Bar specific
  orientation?: 'vertical' | 'horizontal';
  stacked?: boolean;
  showValues?: boolean;
  barWidth?: number;
  // Line specific
  smooth?: boolean;
  showPoints?: boolean;
  filled?: boolean;
  strokeWidth?: number;
  // Pie specific
  donut?: boolean;
  showLabels?: boolean;
  showPercentages?: boolean;
  innerRadius?: number;
  // Metric specific
  showTrend?: boolean;
  showComparison?: boolean;
  fontSize?: 'small' | 'medium' | 'large';
  alignment?: 'left' | 'center' | 'right';
  // Custom CSS
  customCSS?: string;
  // Export formats
  exportFormats?: string[];
  // Margin settings
  margin?: { top?: number; right?: number; bottom?: number; left?: number };
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: 'SALES' | 'FINANCIAL' | 'OPERATIONAL' | 'ANALYTICS' | 'CUSTOM';
  fields: TemplateField[];
  filters: TemplateFilter[];
  visualization: VisualizationConfig;
  isPublic: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
}

export interface PrebuiltTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  thumbnail?: string;
  tags: string[];
  usageCount: number;
  rating: number;
  visualization: {
    type: string;
    config: any;
  };
}

export interface TemplateUsageStats {
  totalUsage: number;
  monthlyUsage: number;
  weeklyUsage: number;
  dailyUsage: number;
  averageRating: number;
  totalRatings: number;
  popularFields: string[];
  commonFilters: string[];
  usageByCategory: Record<string, number>;
  usageOverTime: Array<{
    date: string;
    count: number;
  }>;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export interface CreateTemplateInput {
  name: string;
  description: string;
  category: string;
  fields: Omit<TemplateField, 'id'>[];
  filters: Omit<TemplateFilter, 'id'>[];
  visualization: VisualizationConfig;
  isPublic: boolean;
  tags: string[];
}

export interface UpdateTemplateInput {
  name?: string;
  description?: string;
  category?: string;
  fields?: Omit<TemplateField, 'id'>[];
  filters?: Omit<TemplateFilter, 'id'>[];
  visualization?: VisualizationConfig;
  isPublic?: boolean;
  tags?: string[];
}

export interface TemplateSearchInput {
  query?: string;
  category?: string;
  tags?: string[];
  isPublic?: boolean;
  createdBy?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'usageCount' | 'rating';
  sortOrder?: 'asc' | 'desc';
}

export interface ReportGenerationOptions {
  format?: 'PDF' | 'EXCEL' | 'CSV' | 'JSON';
  includeCharts?: boolean;
  includeRawData?: boolean;
  customFilters?: Record<string, any>;
  dateRange?: {
    start: string;
    end: string;
  };
  emailRecipients?: string[];
  scheduledFor?: string;
}

export interface ShareTemplateInput {
  permissions: ('VIEW' | 'EDIT' | 'CLONE')[];
  expiresAt?: string;
  requiresAuth?: boolean;
  allowedUsers?: string[];
  allowedDomains?: string[];
}

export interface ExportFormat {
  type: 'JSON' | 'YAML' | 'XML';
  includeData?: boolean;
  includeMetadata?: boolean;
}

export interface ImportTemplateOptions {
  overwriteExisting?: boolean;
  validateBeforeImport?: boolean;
  assignToCurrentUser?: boolean;
}

export interface TemplateValidationInput {
  name: string;
  description: string;
  category: string;
  fields: Omit<TemplateField, 'id'>[];
  filters: Omit<TemplateFilter, 'id'>[];
  visualization: VisualizationConfig;
}

export const EXPORT_REPORT = gql`
  mutation ExportReport($templateId: ID!, $format: String!) {
    exportReport(templateId: $templateId, format: $format) {
      url
    }
  }
`;
export const SHARE_REPORT = gql`
  mutation ShareReport($templateId: ID!) {
    shareReport(templateId: $templateId) {
      shareUrl
    }
  }
`;