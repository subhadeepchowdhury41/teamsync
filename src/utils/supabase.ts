// import { createClient } from '@supabase/supabase-js';

// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
// const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// export type Database = {
//   public: {
//     Tables: {
//       users: {
//         Row: {
//           id: string;
//           email: string;
//           name: string;
//           avatar_url: string | null;
//           created_at: string;
//           updated_at: string;
//         };
//         Insert: {
//           id?: string;
//           email: string;
//           name: string;
//           avatar_url?: string | null;
//           created_at?: string;
//           updated_at?: string;
//         };
//         Update: {
//           id?: string;
//           email?: string;
//           name?: string;
//           avatar_url?: string | null;
//           updated_at?: string;
//         };
//       };
//       projects: {
//         Row: {
//           id: string;
//           name: string;
//           description: string | null;
//           created_at: string;
//           updated_at: string;
//           owner_id: string;
//         };
//         Insert: {
//           id?: string;
//           name: string;
//           description?: string | null;
//           created_at?: string;
//           updated_at?: string;
//           owner_id: string;
//         };
//         Update: {
//           id?: string;
//           name?: string;
//           description?: string | null;
//           updated_at?: string;
//           owner_id?: string;
//         };
//       };
//       tasks: {
//         Row: {
//           id: string;
//           title: string;
//           description: string | null;
//           status: 'todo' | 'in_progress' | 'completed';
//           priority: 'low' | 'medium' | 'high';
//           due_date: string | null;
//           created_at: string;
//           updated_at: string;
//           project_id: string;
//           assignee_id: string | null;
//           creator_id: string;
//         };
//         Insert: {
//           id?: string;
//           title: string;
//           description?: string | null;
//           status?: 'todo' | 'in_progress' | 'completed';
//           priority?: 'low' | 'medium' | 'high';
//           due_date?: string | null;
//           created_at?: string;
//           updated_at?: string;
//           project_id: string;
//           assignee_id?: string | null;
//           creator_id: string;
//         };
//         Update: {
//           id?: string;
//           title?: string;
//           description?: string | null;
//           status?: 'todo' | 'in_progress' | 'completed';
//           priority?: 'low' | 'medium' | 'high';
//           due_date?: string | null;
//           updated_at?: string;
//           project_id?: string;
//           assignee_id?: string | null;
//           creator_id?: string;
//         };
//       };
//       task_tags: {
//         Row: {
//           id: string;
//           task_id: string;
//           tag_id: string;
//           created_at: string;
//         };
//         Insert: {
//           id?: string;
//           task_id: string;
//           tag_id: string;
//           created_at?: string;
//         };
//         Update: {
//           id?: string;
//           task_id?: string;
//           tag_id?: string;
//         };
//       };
//       tags: {
//         Row: {
//           id: string;
//           name: string;
//           color: string;
//           created_at: string;
//           project_id: string;
//         };
//         Insert: {
//           id?: string;
//           name: string;
//           color: string;
//           created_at?: string;
//           project_id: string;
//         };
//         Update: {
//           id?: string;
//           name?: string;
//           color?: string;
//           project_id?: string;
//         };
//       };
//       project_members: {
//         Row: {
//           id: string;
//           project_id: string;
//           user_id: string;
//           role: 'owner' | 'admin' | 'member';
//           created_at: string;
//         };
//         Insert: {
//           id?: string;
//           project_id: string;
//           user_id: string;
//           role?: 'owner' | 'admin' | 'member';
//           created_at?: string;
//         };
//         Update: {
//           id?: string;
//           project_id?: string;
//           user_id?: string;
//           role?: 'owner' | 'admin' | 'member';
//         };
//       };
//     };
//   };
// };
