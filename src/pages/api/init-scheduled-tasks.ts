import { NextApiRequest, NextApiResponse } from 'next';
import { initScheduledTasks } from '../../server/utils/scheduledTasks';

// Flag to ensure we only initialize tasks once
let tasksInitialized = false;

/**
 * API route to initialize scheduled tasks
 * This should be called when the server starts
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check for a secret key to prevent unauthorized initialization
  const secretKey = process.env.SCHEDULED_TASKS_SECRET_KEY;
  const providedKey = req.headers['x-scheduled-tasks-key'];

  if (secretKey && providedKey !== secretKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Only initialize once per server instance
    if (!tasksInitialized) {
      initScheduledTasks();
      tasksInitialized = true;
      console.log('Scheduled tasks initialized successfully');
      return res.status(200).json({ success: true, message: 'Scheduled tasks initialized' });
    } else {
      return res.status(200).json({ success: true, message: 'Scheduled tasks already initialized' });
    }
  } catch (error) {
    console.error('Failed to initialize scheduled tasks:', error);
    return res.status(500).json({ error: 'Failed to initialize scheduled tasks' });
  }
}
