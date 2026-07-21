import { STATUS_MAP, BENEFICIARY_STATUS_MAP } from './constants';
import { store } from '../../store';

export function getStatusInfo(status: string) {
  if (!status) return STATUS_MAP['submitted'];
  const normalized = status.toLowerCase();
  return STATUS_MAP[normalized] || STATUS_MAP['submitted'];
}

export function getBeneficiaryStatusInfo(status: string) {
  if (!status) return BENEFICIARY_STATUS_MAP['pending_review'];
  const normalized = status.toLowerCase();
  return BENEFICIARY_STATUS_MAP[normalized] || BENEFICIARY_STATUS_MAP['pending_review'];
}

export function getBeneficiaryStatusColor(status: string) {
  const info = getBeneficiaryStatusInfo(status);
  return info.color || 'bg-slate-50 text-slate-700';
}

export function getBeneficiaryStatusLabel(status: string) {
  const info = getBeneficiaryStatusInfo(status);
  return info.label || status || 'Pending Review';
}

export function getInstitutionName(inst: any) {
  if (!inst) return 'N/A';
  return inst.name?.en || inst.name?.am || inst.shortName || 'N/A';
}

export function getUserFullName(user: any) {
  if (!user) return 'N/A';
  const firstName = user.firstName?.en || user.firstName?.am || '';
  let middleName = '';
  if (user.middleName) {
    if (Array.isArray(user.middleName.en)) middleName = user.middleName.en.join(' ');
    else if (Array.isArray(user.middleName.am)) middleName = user.middleName.am.join(' ');
    else middleName = user.middleName.en || user.middleName.am || '';
  }
  const lastName = user.lastName?.en || user.lastName?.am || '';
  const name = [firstName, middleName, lastName].filter(Boolean).join(' ');
  return name || user.user?.name?.en || user.user?.name?.am || user.user?.username || 'N/A';
}

export function formatDecision(decision: string) {
  if (!decision) return 'Not Reviewed';
  
  const displayMap: Record<string, string> = {
    'allowed': '✅ Allowed',
    'legal_revision_required': '⚖️ Legal Revision Required',
    'unauthorized_by_directive': '❌ Unauthorized by Directive',
    'ALLOWED': '✅ Allowed',
    'LEGAL_REVISION_REQUIRED': '⚖️ Legal Revision Required',
    'UNAUTHORIZED_BY_DIRECTIVE': '❌ Unauthorized by Directive'
  };
  return displayMap[decision] || decision;
}

export function calculateRequestStatus(beneficiaries: any[]) {
  if (!beneficiaries || beneficiaries.length === 0) {
    return 'submitted';
  }

  // Check if ALL beneficiaries are allocated
  const allAllocated = beneficiaries.every(b => 
    (b.status || '').toLowerCase() === 'allocated'
  );
  if (allAllocated) {
    return 'allocated';
  }

  // Get authorized beneficiaries (not unauthorized)
  const authorizedBeneficiaries = beneficiaries.filter(b => 
    (b.status || '').toLowerCase() !== 'unauthorized_by_directive'
  );

  if (authorizedBeneficiaries.length === 0) {
    return 'submitted';
  }

  // Check if ALL authorized beneficiaries are in waiting list
  const allAuthorizedInWaitingList = authorizedBeneficiaries.every(b => 
    (b.status || '').toLowerCase() === 'waiting_list'
  );
  if (allAuthorizedInWaitingList) {
    return 'waiting_list';
  }

  // Check if ANY beneficiary is allocated (but not all)
  const anyAllocated = beneficiaries.some(b => 
    (b.status || '').toLowerCase() === 'allocated'
  );
  if (anyAllocated && !allAllocated) {
    return 'partial_allocation';
  }

  // Check if ANY beneficiary is in waiting list (but not all authorized)
  const anyInWaitingList = authorizedBeneficiaries.some(b => 
    (b.status || '').toLowerCase() === 'waiting_list'
  );
  if (anyInWaitingList && !allAuthorizedInWaitingList) {
    return 'partial_waiting_list';
  }

  // Check if ANY beneficiary is in review
  const anyInReview = beneficiaries.some(b => {
    const status = (b.status || '').toLowerCase();
    return status === 'pending_review' || 
           status === 'eligible' || 
           status === 'under_legal_revision';
  });
  if (anyInReview) {
    return 'under_team_officer_review';
  }

  return 'submitted';
}

export function hasAnyBeneficiaryRejected(beneficiaries: any[]) {
  if (!beneficiaries) return false;
  return beneficiaries.some(b => 
    (b.status || '').toLowerCase() === 'unauthorized_by_directive'
  );
}

export function getPendingBeneficiaries(beneficiaries: any[]) {
  if (!beneficiaries) return [];
  return beneficiaries.filter(b => 
    !b.deputyCeoDecision && !b.directorDecision && !b.teamLeaderDecision && !b.teamOfficerDecision
  );
}

export function getReviewerForStatus(status: string) {
  const reviewerMap: Record<string, string> = {
    'under_deputy_ceo_review': 'Deputy CEO',
    'under_director_review': 'Director',
    'pending_team_leader_decision': 'Team Leader',
    'under_team_officer_review': 'Team Officer'
  };
  return reviewerMap[status] || null;
}

export function getReviewerDecisionField(status: string) {
  const fieldMap: Record<string, string> = {
    'under_deputy_ceo_review': 'deputyCeoDecision',
    'under_director_review': 'directorDecision',
    'pending_team_leader_decision': 'teamLeaderDecision',
    'under_team_officer_review': 'teamOfficerDecision'
  };
  return fieldMap[status] || null;
}

export function areAllBeneficiariesReviewed(beneficiaries: any[]) {
  if (!beneficiaries || beneficiaries.length === 0) return false;
  
  const reviewerDecisions = ['deputyCeoDecision', 'directorDecision', 'teamLeaderDecision', 'teamOfficerDecision'];
  
  // Check which reviewer should have made decisions based on current request status
  // For now, check if any decision exists
  return beneficiaries.every(b => {
    // Check if any decision exists (deputyCeoDecision, directorDecision, etc.)
    return b.deputyCeoDecision || b.directorDecision || b.teamLeaderDecision || b.teamOfficerDecision;
  });
}

export function getCurrentUserRoleKeys() {
  return store.getCurrentUserRoleKeys();
}

export function hasRole(roleKey: string) {
  return store.hasRole(roleKey);
}

export function isSuperAdmin() {
  return store.isSuperAdmin();
}

export function getRoleDisplay(roleKey: string) {
  const displayMap: Record<string, string> = {
    'super_admin': 'Super Admin',
    'deputy_ceo': 'Deputy CEO',
    'director': 'Director',
    'team_leader': 'Team Leader',
    'data_encoder': 'Data Encoder'
  };
  return displayMap[roleKey.toLowerCase()] || roleKey;
}
