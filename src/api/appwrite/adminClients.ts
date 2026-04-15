/**
 * Server-only — Appwrite admin SDK (API key). Do not import from React.
 */
import { Client, Databases, Teams, Users } from 'node-appwrite';
import { assertServerConfigured, getAppwriteServerEnv } from './serverEnv';

export type AdminClients = {
  databases: Databases;
  teams: Teams;
  users: Users;
};

let cached: AdminClients | null = null;

export function getAdminClients(): AdminClients {
  if (cached) return cached;
  const env = getAppwriteServerEnv();
  assertServerConfigured(env);
  const client = new Client().setEndpoint(env.endpoint).setProject(env.projectId).setKey(env.apiKey);
  cached = {
    databases: new Databases(client),
    teams: new Teams(client),
    users: new Users(client),
  };
  return cached;
}
