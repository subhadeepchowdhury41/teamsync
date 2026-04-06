import { initScheduledTasks } from './scheduledTasks';

// Flag to ensure we only initialize once
let initialized = false;

/**
 * Initialize server components that need to be run once
 * This includes scheduled tasks and any other server-side initialization
 */
export function initializeServer(): void {
  if (initialized) {
    return;
  }

  // Only run in server environment
  if (typeof window === 'undefined') {
    console.log('Initializing server components...');
    
    // Initialize scheduled tasks
    initScheduledTasks();
    
    initialized = true;
    console.log('Server initialization complete');
  }
}
