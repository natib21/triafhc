export const STATUS_MAP = {
  'draft': { label: 'Draft', color: 'bg-slate-50 text-slate-600 border-slate-200' },
  'submitted': { label: 'Submitted', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  'under_deputy_ceo_review': { label: 'Deputy CEO Review', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  'under_director_review': { label: 'Director Review', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  'pending_team_leader_decision': { label: 'Team Leader Review', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  'under_team_officer_review': { label: 'Team Officer Review', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  'partial_waiting_list': { label: 'Partial Waiting List', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  'partial_allocation': { label: 'Partial Allocation', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  'waiting_list': { label: 'Waiting List', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  'allocated': { label: 'Allocated', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
};

export const WORKFLOW_STEPS = [
  { key: 'draft', label: 'Draft', icon: 'fa-regular fa-file-pen' },
  { key: 'submitted', label: 'Submitted', icon: 'fa-regular fa-file-lines' },
  { key: 'under_deputy_ceo_review', label: 'Deputy CEO Review', icon: 'fa-regular fa-user-tie' },
  { key: 'under_director_review', label: 'Director Review', icon: 'fa-regular fa-user' },
  { key: 'pending_team_leader_decision', label: 'Team Leader Review', icon: 'fa-regular fa-clipboard-check' },
  { key: 'under_team_officer_review', label: 'Team Officer Review', icon: 'fa-regular fa-user-gear' },
  { key: 'partial_waiting_list', label: 'Partial Waiting List', icon: 'fa-regular fa-clock', conditional: true },
  { key: 'partial_allocation', label: 'Partial Allocation', icon: 'fa-regular fa-building', conditional: true },
  { key: 'waiting_list', label: 'Waiting List', icon: 'fa-regular fa-list', conditional: true },
  { key: 'allocated', label: 'Allocated', icon: 'fa-regular fa-circle-check', conditional: true }
];

export const BENEFICIARY_STATUS_MAP = {
  'pending_review': { label: 'Pending Review', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  'eligible': { label: 'Eligible', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  'under_legal_revision': { label: 'Legal Revision', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  'waiting_list': { label: 'Waiting List', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  'allocated': { label: 'Allocated', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  'unauthorized_by_directive': { label: 'Unauthorized', color: 'bg-rose-50 text-rose-700 border-rose-200' }
};

export const WORKFLOW_ROLE_MAP = {
  'submitted': { role: 'deputy_ceo', action: 'start_review', label: 'Start Deputy Review' },
  'under_deputy_ceo_review': { role: 'deputy_ceo', action: 'submit_decision', label: 'Submit Decision' },
  'under_director_review': { role: 'director', action: 'submit_decision', label: 'Submit Decision' },
  'pending_team_leader_decision': { role: 'team_leader', action: 'submit_decision', label: 'Submit Decision' },
  'under_team_officer_review': { role: 'team_officer', action: 'process', label: 'Process Beneficiaries' }
};