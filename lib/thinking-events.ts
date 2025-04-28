import { EventEmitter } from 'events';

// Create a global event emitter to broadcast thinking updates
// This is a simple approach for development - in production you might use Redis or another solution
const thinkingEvents = new EventEmitter();
thinkingEvents.setMaxListeners(100); // Increase max listeners to avoid warnings

export default thinkingEvents;
