/**
 * base44Client - Dal backend API compatibility layer
 * Replaces @base44/sdk with our Dal backend
 */
import { api, auth, entities } from './dalClient';

export const base44 = {
  auth,
  entities: {
    ...entities,
  },
  integrations: {
    Core: {
      UploadFile: async () => ({ file_url: '' }),
    },
  },
  users: { inviteUser: async () => {} },
  appLogs: { logUserInApp: async () => {} },
};
