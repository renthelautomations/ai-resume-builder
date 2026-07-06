# AI Resume Builder - UI/UX Guidelines

## Confirmation Messages & Destructive Actions
- **NEVER** use the native browser `window.confirm()` or `alert()` for user confirmations (especially for destructive actions like deleting a resume or profile).
- **ALWAYS** use the custom `ConfirmationModal` component located at `src/components/ConfirmationModal.jsx`.
- **Implementation Pattern:**
  1. Import the modal: `import ConfirmationModal from '../ConfirmationModal';`
  2. Maintain state for the modal visibility and the item to act upon (e.g., `showDeleteModal`, `itemToDelete`).
  3. Render `<ConfirmationModal isOpen={showDeleteModal} title="..." message="..." onConfirm={handleConfirm} onCancel={handleCancel} />` in the component tree.

## Success and Error Notifications (Toasts)
- **NEVER** use `alert()` to notify the user of success, errors, or info.
- **ALWAYS** use the `useToast` hook from the `ToastContext` located at `src/context/ToastContext.jsx`.
- **Implementation Pattern:**
  1. Import the hook: `import { useToast } from '../../context/ToastContext';`
  2. Initialize the hook in your component: `const { addToast } = useToast();`
  3. Call the function: `addToast('Profile deleted successfully!', 'success');` (Supported types: `'success'`, `'error'`, `'info'`).
