import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/**
 * Acesso sem tipos para colunas/funções acrescentadas depois da última geração
 * de tipos (suspended, max_screens, is_superadmin, admin_create_organization).
 * Quando os tipos forem regenerados, pode passar a usar-se `supabase` diretamente.
 */
export const db = supabase as unknown as SupabaseClient;
