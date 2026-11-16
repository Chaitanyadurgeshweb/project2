/** Usernames are stored as synthetic emails so Supabase Auth can handle passwords. */
export const usernameToEmail = (username: string) => `${username.trim().toLowerCase()}@chaitu.local`;
