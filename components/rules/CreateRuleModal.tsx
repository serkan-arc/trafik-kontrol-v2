'use client';

import { useState } from 'react';

interface CreateRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Condition {
  id: string;
  field: string;
  operator: string;
  value: string;
}

interface ConditionGroup {
  id: string;
  conditions: Condition[];
  logic: 'AND' | 'OR';
}

interface RuleFormData {
  name: string;
  description: string;
  priority: number;
  isActive: boolean;
  conditionGroups: ConditionGroup[];
  groupLogic: 'AND' | 'OR';
  action: string;
  actionOptions: {
    sendEmail: boolean;
    logExternal: boolean;
    addNote: boolean;
    triggerVersion: boolean;
  };
  customMessage?: string;
}

const INITIAL_FORM_DATA: RuleFormData = {
  name: '',
  description: '',
  priority: 5,
  isActive: true,
  conditionGroups: [],
  groupLogic: 'AND',
  action: 'blacklist',
  actionOptions: {
    sendEmail: false,
    logExternal: false,
    addNote: false,
    triggerVersion: false,
  },
  customMessage: ''
};

const AVAILABLE_FIELDS = [
  { value: 'risk_score', label: 'Risk Score', type: 'number' },
  { value: 'spam_score', label: 'Spam Score', type: 'number' },
  { value: 'bot_score', label: 'Bot Score', type: 'number' },
  { value: 'visit_count', label: 'Visit Count', type: 'number' },
  { value: 'form_submissions', label: 'Form Submissions', type: 'number' },
  { value: 'country', label: 'Country', type: 'string' },
  { value: 'device_type', label: 'Device Type', type: 'string' },
  { value: 'list_status', label: 'List Status', type: 'string' },
];

const OPERATORS = {
  number: [
    { value: '>', label: 'Greater than' },
    { value: '>=', label: 'Greater than or equal' },
    { value: '<', label: 'Less than' },
    { value: '<=', label: 'Less than or equal' },
    { value: '=', label: 'Equal to' },
    { value: '!=', label: 'Not equal to' },
  ],
  string: [
    { value: '=', label: 'Equals' },
    { value: '!=', label: 'Not equals' },
    { value: 'contains', label: 'Contains' },
    { value: 'startsWith', label: 'Starts with' },
    { value: 'endsWith', label: 'Ends with' },
  ]
};

const ACTIONS = [
  { value: 'whitelist', label: 'Move to Whitelist' },
  { value: 'graylist', label: 'Move to Graylist' },
  { value: 'blacklist', label: 'Move to Blacklist' },
  { value: 'increment_risk', label: 'Increment Risk Score' },
  { value: 'send_alert', label: 'Send Alert' },
  { value: 'block_access', label: 'Block Access' },
];

export default function CreateRuleModal({ isOpen, onClose, onSuccess }: CreateRuleModalProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<RuleFormData>(INITIAL_FORM_DATA);
  const [loading, setLoading] = useState(false);
  const [previewCount, setPreviewCount] = useState<number | null>(null);

  if (!isOpen) return null;

  const addConditionGroup = () => {
    const newGroup: ConditionGroup = {
      id: `group-${Date.now()}`,
      conditions: [],
      logic: 'AND'
    };
    setFormData({
      ...formData,
      conditionGroups: [...formData.conditionGroups, newGroup]
    });
  };

  const removeConditionGroup = (groupId: string) => {
    setFormData({
      ...formData,
      conditionGroups: formData.conditionGroups.filter(g => g.id !== groupId)
    });
  };

  const addCondition = (groupId: string) => {
    const newCondition: Condition = {
      id: `cond-${Date.now()}`,
      field: 'risk_score',
      operator: '>',
      value: ''
    };
    
    setFormData({
      ...formData,
      conditionGroups: formData.conditionGroups.map(group =>
        group.id === groupId
          ? { ...group, conditions: [...group.conditions, newCondition] }
          : group
      )
    });
  };

  const removeCondition = (groupId: string, conditionId: string) => {
    setFormData({
      ...formData,
      conditionGroups: formData.conditionGroups.map(group =>
        group.id === groupId
          ? { ...group, conditions: group.conditions.filter(c => c.id !== conditionId) }
          : group
      )
    });
  };

  const updateCondition = (groupId: string, conditionId: string, field: keyof Condition, value: string) => {
    setFormData({
      ...formData,
      conditionGroups: formData.conditionGroups.map(group =>
        group.id === groupId
          ? {
              ...group,
              conditions: group.conditions.map(cond =>
                cond.id === conditionId ? { ...cond, [field]: value } : cond
              )
            }
          : group
      )
    });
  };

  const updateGroupLogic = (groupId: string, logic: 'AND' | 'OR') => {
    setFormData({
      ...formData,
      conditionGroups: formData.conditionGroups.map(group =>
        group.id === groupId ? { ...group, logic } : group
      )
    });
  };

  const previewMatches = async () => {
    try {
      const res = await fetch('/api/traffic/rules/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conditionGroups: formData.conditionGroups, groupLogic: formData.groupLogic })
      });
      const data = await res.json();
      if (data.success) {
        setPreviewCount(data.data.matchCount);
      }
    } catch (error) {
      console.error('Error previewing matches:', error);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/traffic/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      
      if (data.success) {
        onSuccess();
        onClose();
        setFormData(INITIAL_FORM_DATA);
        setStep(1);
      }
    } catch (error) {
      console.error('Error creating rule:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFieldType = (fieldName: string) => {
    return AVAILABLE_FIELDS.find(f => f.value === fieldName)?.type || 'string';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-2xl font-bold">Create New Auto Rule</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">
            ×
          </button>
        </div>

        {/* Step Indicator */}
        <div className="p-6 border-b bg-gray-50">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            <div className={`flex items-center ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-300'}`}>
                1
              </div>
              <span className="ml-2 font-medium">Basic Info</span>
            </div>
            <div className={`flex-1 h-1 mx-4 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
            <div className={`flex items-center ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-300'}`}>
                2
              </div>
              <span className="ml-2 font-medium">Conditions</span>
            </div>
            <div className={`flex-1 h-1 mx-4 ${step >= 3 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
            <div className={`flex items-center ${step >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-300'}`}>
                3
              </div>
              <span className="ml-2 font-medium">Actions</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Basic Information</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rule Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="e.g., High Risk Auto-Block"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={3}
                  placeholder="Describe what this rule does..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority: {formData.priority}
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>1 (Highest)</span>
                  <span>10 (Lowest)</span>
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm font-medium">Activate rule immediately</span>
                </label>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Condition Builder</h3>
                {previewCount !== null && (
                  <div className="text-sm text-gray-600">
                    Preview: <span className="font-bold text-blue-600">{previewCount}</span> IPs match
                  </div>
                )}
              </div>

              {formData.conditionGroups.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <p className="text-gray-600 mb-4">No conditions yet. Add your first condition group.</p>
                  <button
                    onClick={addConditionGroup}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    + Add Condition Group
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.conditionGroups.map((group, groupIndex) => (
                    <div key={group.id}>
                      {groupIndex > 0 && (
                        <div className="flex items-center justify-center my-2">
                          <select
                            value={formData.groupLogic}
                            onChange={(e) => setFormData({ ...formData, groupLogic: e.target.value as 'AND' | 'OR' })}
                            className="px-3 py-1 border rounded text-sm font-medium"
                          >
                            <option value="AND">AND</option>
                            <option value="OR">OR</option>
                          </select>
                        </div>
                      )}

                      <div className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-medium">Condition Group {groupIndex + 1}</span>
                          <button
                            onClick={() => removeConditionGroup(group.id)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Remove Group
                          </button>
                        </div>

                        {group.conditions.map((condition, condIndex) => (
                          <div key={condition.id}>
                            {condIndex > 0 && (
                              <div className="flex items-center my-2">
                                <select
                                  value={group.logic}
                                  onChange={(e) => updateGroupLogic(group.id, e.target.value as 'AND' | 'OR')}
                                  className="px-2 py-1 border rounded text-xs font-medium"
                                >
                                  <option value="AND">AND</option>
                                  <option value="OR">OR</option>
                                </select>
                              </div>
                            )}

                            <div className="flex gap-2 items-start bg-white p-3 rounded border">
                              <select
                                value={condition.field}
                                onChange={(e) => updateCondition(group.id, condition.id, 'field', e.target.value)}
                                className="px-3 py-2 border rounded flex-1"
                              >
                                {AVAILABLE_FIELDS.map(field => (
                                  <option key={field.value} value={field.value}>{field.label}</option>
                                ))}
                              </select>

                              <select
                                value={condition.operator}
                                onChange={(e) => updateCondition(group.id, condition.id, 'operator', e.target.value)}
                                className="px-3 py-2 border rounded"
                              >
                                {OPERATORS[getFieldType(condition.field) as 'number' | 'string'].map(op => (
                                  <option key={op.value} value={op.value}>{op.label}</option>
                                ))}
                              </select>

                              <input
                                type={getFieldType(condition.field) === 'number' ? 'number' : 'text'}
                                value={condition.value}
                                onChange={(e) => updateCondition(group.id, condition.id, 'value', e.target.value)}
                                className="px-3 py-2 border rounded flex-1"
                                placeholder="Value"
                              />

                              <button
                                onClick={() => removeCondition(group.id, condition.id)}
                                className="px-3 py-2 text-red-600 hover:text-red-800"
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        ))}

                        <button
                          onClick={() => addCondition(group.id)}
                          className="mt-3 px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50"
                        >
                          + Add Condition
                        </button>
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={addConditionGroup}
                    className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-800"
                  >
                    + Add Condition Group
                  </button>

                  <button
                    onClick={previewMatches}
                    className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
                  >
                    Preview Matching IPs
                  </button>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Action Configuration</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Primary Action *
                </label>
                <select
                  value={formData.action}
                  onChange={(e) => setFormData({ ...formData, action: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  {ACTIONS.map(action => (
                    <option key={action.value} value={action.value}>{action.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Options
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.actionOptions.sendEmail}
                    onChange={(e) => setFormData({
                      ...formData,
                      actionOptions: { ...formData.actionOptions, sendEmail: e.target.checked }
                    })}
                    className="rounded"
                  />
                  <span className="text-sm">Send email notification</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.actionOptions.logExternal}
                    onChange={(e) => setFormData({
                      ...formData,
                      actionOptions: { ...formData.actionOptions, logExternal: e.target.checked }
                    })}
                    className="rounded"
                  />
                  <span className="text-sm">Log to external system</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.actionOptions.addNote}
                    onChange={(e) => setFormData({
                      ...formData,
                      actionOptions: { ...formData.actionOptions, addNote: e.target.checked }
                    })}
                    className="rounded"
                  />
                  <span className="text-sm">Add note to IP record</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.actionOptions.triggerVersion}
                    onChange={(e) => setFormData({
                      ...formData,
                      actionOptions: { ...formData.actionOptions, triggerVersion: e.target.checked }
                    })}
                    className="rounded"
                  />
                  <span className="text-sm">Trigger version progression</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Custom Message (optional)
                </label>
                <textarea
                  value={formData.customMessage}
                  onChange={(e) => setFormData({ ...formData, customMessage: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={3}
                  placeholder="Custom message to display or log..."
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
          >
            Cancel
          </button>

          <div className="flex gap-2">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
              >
                ← Previous
              </button>
            )}

            {step < 3 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={step === 1 && !formData.name}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading || !formData.name || formData.conditionGroups.length === 0}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Rule'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
