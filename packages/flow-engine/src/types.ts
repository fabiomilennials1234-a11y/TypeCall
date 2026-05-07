export type StepType =
  | 'welcome'
  | 'short_text'
  | 'long_text'
  | 'email'
  | 'phone'
  | 'number'
  | 'multiple_choice'
  | 'checkboxes'
  | 'dropdown'
  | 'rating'
  | 'nps'
  | 'date'
  | 'file_upload'
  | 'schedule'
  | 'payment'
  | 'statement'
  | 'ending'
  | 'logic_branch'

export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'greater_than'
  | 'less_than'
  | 'greater_than_or_equals'
  | 'less_than_or_equals'
  | 'is_empty'
  | 'is_not_empty'
  | 'in'
  | 'not_in'

export interface Condition {
  field: string
  operator: ConditionOperator
  value: string | number | boolean | string[]
}

export interface FlowEdge {
  id: string
  source: string
  target: string
  condition?: Condition
}

export interface NodePosition {
  x: number
  y: number
}

export interface BaseNodeData {
  label: string
  description?: string
  required?: boolean
  // Optional per-block font key (matches FONTS list in apps/web). When unset,
  // the runner falls back to the form-level body font.
  font?: string
}

export interface WelcomeNodeData extends BaseNodeData {
  buttonText?: string
}

export interface ShortTextNodeData extends BaseNodeData {
  placeholder?: string
  maxLength?: number
}

export interface LongTextNodeData extends BaseNodeData {
  placeholder?: string
  maxLength?: number
  minLength?: number
}

export interface EmailNodeData extends BaseNodeData {
  placeholder?: string
}

export interface PhoneNodeData extends BaseNodeData {
  placeholder?: string
  countryCode?: string
}

export interface NumberNodeData extends BaseNodeData {
  placeholder?: string
  min?: number
  max?: number
}

export interface MultipleChoiceNodeData extends BaseNodeData {
  choices: Choice[]
  allowOther?: boolean
  randomize?: boolean
}

export interface Choice {
  id: string
  label: string
  value: string
}

export interface CheckboxesNodeData extends BaseNodeData {
  choices: Choice[]
  minSelections?: number
  maxSelections?: number
  allowOther?: boolean
}

export interface DropdownNodeData extends BaseNodeData {
  choices: Choice[]
  placeholder?: string
  searchable?: boolean
}

export interface RatingNodeData extends BaseNodeData {
  steps: number
  shape?: 'star' | 'heart' | 'emoji'
}

export interface NpsNodeData extends BaseNodeData {
  lowLabel?: string
  highLabel?: string
}

export interface DateNodeData extends BaseNodeData {
  format?: string
  minDate?: string
  maxDate?: string
}

export interface FileUploadNodeData extends BaseNodeData {
  maxSizeMb?: number
  allowedTypes?: string[]
}

export interface ScheduleNodeData extends BaseNodeData {
  eventTypeId: string
}

export interface PaymentNodeData extends BaseNodeData {
  amount?: number
  currency?: string
}

export interface StatementNodeData extends BaseNodeData {
  buttonText?: string
}

export interface EndingNodeData extends BaseNodeData {
  showSocialShare?: boolean
  redirectUrl?: string
}

export type QuestionData =
  | { type: 'welcome'; props: WelcomeNodeData }
  | { type: 'short_text'; props: ShortTextNodeData }
  | { type: 'long_text'; props: LongTextNodeData }
  | { type: 'email'; props: EmailNodeData }
  | { type: 'phone'; props: PhoneNodeData }
  | { type: 'number'; props: NumberNodeData }
  | { type: 'multiple_choice'; props: MultipleChoiceNodeData }
  | { type: 'checkboxes'; props: CheckboxesNodeData }
  | { type: 'dropdown'; props: DropdownNodeData }
  | { type: 'rating'; props: RatingNodeData }
  | { type: 'nps'; props: NpsNodeData }
  | { type: 'date'; props: DateNodeData }
  | { type: 'file_upload'; props: FileUploadNodeData }
  | { type: 'schedule'; props: ScheduleNodeData }
  | { type: 'payment'; props: PaymentNodeData }
  | { type: 'statement'; props: StatementNodeData }
  | { type: 'ending'; props: EndingNodeData }

export interface FlowNode {
  id: string
  type: StepType
  position: NodePosition
  data: QuestionData
}

export interface FlowDefinition {
  nodes: FlowNode[]
  edges: FlowEdge[]
}

export type AnswerValue = string | number | boolean | string[] | null

export type Answers = Record<string, AnswerValue>

export interface ValidationError {
  field: string
  message: string
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

export interface TraversalResult {
  nextNodeId: string | null
  isEnd: boolean
}
