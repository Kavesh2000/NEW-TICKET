/**
 * Approval Workflow Module - Reusable multi-level approval system
 * Supports sequential role-based approvals with audit logging
 */

class ApprovalWorkflow {
    constructor(workflowConfig) {
        this.config = workflowConfig; // { moduleName, steps: [{stepId, role, approver}, ...] }
        this.workflows = this.loadWorkflows();
    }

    /**
     * Load all workflows from localStorage
     */
    loadWorkflows() {
        try {
            return JSON.parse(localStorage.getItem('approvalWorkflows') || '[]');
        } catch (e) {
            return [];
        }
    }

    /**
     * Save workflows to localStorage
     */
    saveWorkflows() {
        localStorage.setItem('approvalWorkflows', JSON.stringify(this.workflows));
    }

    /**
     * Load audit logs from localStorage
     */
    loadAuditLogs() {
        try {
            return JSON.parse(localStorage.getItem('approvalAuditLogs') || '[]');
        } catch (e) {
            return [];
        }
    }

    /**
     * Save audit logs
     */
    saveAuditLogs(logs) {
        localStorage.setItem('approvalAuditLogs', JSON.stringify(logs));
    }

    /**
     * Create a new workflow instance
     */
    createWorkflow(requestId, moduleName, data, requestorEmail) {
        const workflow = {
            id: `WF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            requestId,
            moduleName,
            data,
            requestorEmail,
            createdAt: new Date().toISOString(),
            status: 'pending', // pending, in-progress, approved, rejected
            currentStep: 0, // Index of current step
            steps: this.config.steps.map((step, idx) => ({
                ...step,
                stepIndex: idx,
                status: idx === 0 ? 'pending' : 'awaiting', // pending, approved, rejected, awaiting
                approvedAt: null,
                approvedBy: null,
                rejectionReason: null
            }))
        };

        this.workflows.push(workflow);
        this.saveWorkflows();
        this.logAudit('WORKFLOW_CREATED', requestId, moduleName, requestorEmail, 'Workflow created');
        return workflow;
    }

    /**
     * Get workflow by ID
     */
    getWorkflow(workflowId) {
        return this.workflows.find(w => w.id === workflowId);
    }

    /**
     * Get workflows for a request
     */
    getWorkflowsByRequestId(requestId) {
        return this.workflows.filter(w => w.requestId === requestId);
    }

    /**
     * Get pending approvals for a role
     */
    getPendingApprovalsForRole(role) {
        return this.workflows
            .filter(w => w.status !== 'approved' && w.status !== 'rejected')
            .filter(w => {
                const currentStep = w.steps[w.currentStep];
                return currentStep && currentStep.role === role && currentStep.status === 'pending';
            });
    }

    /**
     * Approve current step
     */
    approveStep(workflowId, approverEmail, approverRole, approverDept, comments = '') {
        const workflow = this.getWorkflow(workflowId);
        if (!workflow) throw new Error('Workflow not found');

        const currentStep = workflow.steps[workflow.currentStep];
        if (!currentStep) throw new Error('No current step found');

        // Enforce role-based access
        if (currentStep.role !== approverRole) {
            throw new Error(`Only ${currentStep.role} can approve this step`);
        }

        // Enforce department-based access
        if (currentStep.department && currentStep.department !== approverDept) {
            throw new Error(`Only ${currentStep.department} department can approve this step`);
        }

        if (currentStep.status !== 'pending') {
            throw new Error(`Step ${workflow.currentStep} is not pending approval`);
        }

        // Mark step as approved
        currentStep.status = 'approved';
        currentStep.approvedAt = new Date().toISOString();
        currentStep.approvedBy = approverEmail;
        currentStep.approverDept = approverDept;

        // Log approval
        this.logAudit('STEP_APPROVED', workflow.requestId, workflow.moduleName, approverEmail, 
            `Step ${workflow.currentStep} (${currentStep.stepId}) approved. ${comments}`);

        // Move to next step or complete workflow
        workflow.currentStep++;

        if (workflow.currentStep >= workflow.steps.length) {
            // All steps completed
            workflow.status = 'approved';
            this.logAudit('WORKFLOW_APPROVED', workflow.requestId, workflow.moduleName, approverEmail, 'Workflow fully approved');
        } else {
            // Move to next step
            workflow.steps[workflow.currentStep].status = 'pending';
            workflow.status = 'in-progress';
        }

        this.saveWorkflows();
        return workflow;
    }

    /**
     * Reject workflow at current step
     */
    rejectStep(workflowId, rejectorEmail, rejectorRole, rejectorDept, rejectionReason) {
        const workflow = this.getWorkflow(workflowId);
        if (!workflow) throw new Error('Workflow not found');

        const currentStep = workflow.steps[workflow.currentStep];
        if (!currentStep) throw new Error('No current step found');

        // Enforce role-based access
        if (currentStep.role !== rejectorRole) {
            throw new Error(`Only ${currentStep.role} can reject at this step`);
        }

        // Enforce department-based access
        if (currentStep.department && currentStep.department !== rejectorDept) {
            throw new Error(`Only ${currentStep.department} department can reject at this step`);
        }

        // Mark current step as rejected
        currentStep.status = 'rejected';
        currentStep.rejectionReason = rejectionReason;
        currentStep.rejectedAt = new Date().toISOString();
        currentStep.rejectedBy = rejectorEmail;

        // Mark entire workflow as rejected
        workflow.status = 'rejected';

        this.logAudit('WORKFLOW_REJECTED', workflow.requestId, workflow.moduleName, rejectorEmail, 
            `Rejected at step ${workflow.currentStep} (${currentStep.stepId}). Reason: ${rejectionReason}`);

        this.saveWorkflows();
        return workflow;
    }

    /**
     * Get next approver for workflow
     */
    getNextApprover(workflowId) {
        const workflow = this.getWorkflow(workflowId);
        if (!workflow || workflow.status === 'approved' || workflow.status === 'rejected') {
            return null;
        }

        const currentStep = workflow.steps[workflow.currentStep];
        return currentStep ? { stepId: currentStep.stepId, role: currentStep.role, approver: currentStep.approver } : null;
    }

    /**
     * Get approval progress
     */
    getApprovalProgress(workflowId) {
        const workflow = this.getWorkflow(workflowId);
        if (!workflow) return null;

        return {
            workflowId,
            requestId: workflow.requestId,
            status: workflow.status,
            totalSteps: workflow.steps.length,
            completedSteps: workflow.steps.filter(s => s.status === 'approved').length,
            currentStep: workflow.currentStep,
            currentStepInfo: workflow.steps[workflow.currentStep] || null,
            steps: workflow.steps.map(s => ({
                stepId: s.stepId,
                role: s.role,
                status: s.status,
                approvedBy: s.approvedBy,
                approvedAt: s.approvedAt,
                rejectionReason: s.rejectionReason
            }))
        };
    }

    /**
     * Audit logging - record every action
     */
    logAudit(action, requestId, moduleName, actor, details) {
        const logs = this.loadAuditLogs();
        logs.push({
            id: `AUDIT-${Date.now()}`,
            timestamp: new Date().toISOString(),
            action,
            requestId,
            moduleName,
            actor,
            details
        });
        this.saveAuditLogs(logs);
    }

    /**
     * Get audit trail for a request
     */
    getAuditTrail(requestId) {
        const logs = this.loadAuditLogs();
        return logs.filter(l => l.requestId === requestId).sort((a, b) => 
            new Date(a.timestamp) - new Date(b.timestamp)
        );
    }

    /**
     * Check if workflow can be resubmitted after rejection
     */
    canResubmit(workflowId) {
        const workflow = this.getWorkflow(workflowId);
        return workflow && workflow.status === 'rejected';
    }

    /**
     * Resubmit workflow after rejection (reset to step 0)
     */
    resubmitWorkflow(workflowId, submitterEmail) {
        const workflow = this.getWorkflow(workflowId);
        if (!workflow) throw new Error('Workflow not found');
        if (!this.canResubmit(workflowId)) throw new Error('Workflow cannot be resubmitted');

        // Reset workflow
        workflow.status = 'in-progress';
        workflow.currentStep = 0;
        workflow.steps.forEach((step, idx) => {
            step.status = idx === 0 ? 'pending' : 'awaiting';
            step.approvedAt = null;
            step.approvedBy = null;
            step.rejectionReason = null;
            step.rejectedAt = null;
            step.rejectedBy = null;
        });

        this.logAudit('WORKFLOW_RESUBMITTED', workflow.requestId, workflow.moduleName, submitterEmail, 'Workflow resubmitted after rejection');
        this.saveWorkflows();
        return workflow;
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ApprovalWorkflow;
}
