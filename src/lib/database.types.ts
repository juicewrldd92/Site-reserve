/**
 * Types du schéma Postgres.
 *
 * Écrits à la main pour rester lisibles ; à régénérer avec
 * `supabase gen types typescript --project-id <id>` si le schéma diverge.
 *
 * Tout est en `type` et non en `interface` : supabase-js contraint le schéma à
 * `Record<string, unknown>`, or une interface n'obtient pas d'index signature
 * implicite — le typage des requêtes retomberait silencieusement sur `never`.
 */

export type MemberRole = 'owner' | 'manager' | 'staff'

export type ProfileRow = {
  id: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
}

export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'incomplete'

export type OrganizationRow = {
  id: string
  name: string
  owner_id: string
  created_at: string
  /** Fin de l'essai gratuit ; fait foi tant qu'aucun abonnement n'existe. */
  trial_ends_at: string
  subscription_status: SubscriptionStatus
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  current_period_end: string | null
}

export type EstablishmentRow = {
  id: string
  org_id: string
  name: string
  cuisine_type: string | null
  address: string | null
  locations: string[]
  image_url: string | null
  /** Nombre de jours avant DLC qui déclenche une alerte. */
  dlc_alert_days: number
  created_at: string
}

export type MembershipRow = {
  id: string
  org_id: string
  user_id: string
  role: MemberRole
  establishment_id: string | null
  created_at: string
}

export type InvitationRow = {
  id: string
  org_id: string
  email: string
  role: MemberRole
  establishment_id: string | null
  invited_by: string | null
  created_at: string
  accepted_at: string | null
}

/** `sent` est conservé pour les listes créées avant le cycle de vie complet. */
export type OrderStatus = 'draft' | 'sent' | 'ordered' | 'received'

export type SupplierRow = {
  id: string
  org_id: string
  name: string
  contact: string | null
  created_at: string
}

export type OrderListRow = {
  id: string
  establishment_id: string
  name: string
  status: OrderStatus
  supplier_id: string | null
  created_by: string | null
  created_at: string
  sent_at: string | null
  ordered_at: string | null
  received_at: string | null
}

export type OrderListItemRow = {
  id: string
  order_list_id: string
  product_id: string
  quantity: number
  unit: ProductUnit
  note: string | null
  is_checked: boolean
  received_quantity: number | null
  supplier_id: string | null
  created_at: string
}

/** Vue de lecture : la ligne de commande jointe à sa fiche produit. */
export type OrderListItemView = OrderListItemRow & {
  name: string
  brand: string | null
  image_url: string | null
  supplier_name: string | null
}

export type StockPresetRow = {
  id: string
  establishment_id: string
  name: string
  created_by: string | null
  created_at: string
  updated_at: string
}

export type StockPresetItemRow = {
  id: string
  preset_id: string
  product_id: string | null
  label: string | null
  barcode: string | null
  quantity: number
  unit: ProductUnit
  location: string
  position: number
  created_at: string
}

export type PushSubscriptionRow = {
  id: string
  user_id: string
  establishment_id: string
  endpoint: string
  p256dh: string
  auth: string
  created_at: string
  last_sent_at: string | null
}

export type ProductUnit =
  | 'piece'
  | 'kg'
  | 'g'
  | 'l'
  | 'ml'
  | 'boite'
  | 'bouteille'
  | 'sac'
  | 'sachet'
  | 'botte'
  | 'bidon'
  | 'brique'
  | 'barquette'

export type ProductSource = 'openfoodfacts' | 'manual'

export type StockItemRow = {
  id: string
  establishment_id: string
  product_id: string
  quantity: number
  unit: ProductUnit
  /** Sous ce seuil, alerte « stock bas ». */
  min_threshold: number | null
  /** Niveau visé au réapprovisionnement — sert à calculer la quantité à commander. */
  target_quantity: number | null
  /** Délai d'alerte DLC propre au produit ; `null` = réglage de l'établissement. */
  alert_lead_days: number | null
  location: string
  updated_at: string
  updated_by: string | null
}

export type StockBatchRow = {
  id: string
  stock_item_id: string
  quantity: number
  /** DLC ou DLUO, format ISO `YYYY-MM-DD`. */
  expiry_date: string
  created_at: string
  created_by: string | null
}

/** Vue de lecture : la ligne de stock jointe à sa fiche produit. */
export type StockOverviewRow = StockItemRow & {
  name: string
  brand: string | null
  image_url: string | null
  category: string | null
  barcode: string | null
  source: ProductSource
  supplier_id: string | null
  supplier_name: string | null
  /** DLC la plus proche parmi les lots, `null` si aucun lot daté. */
  next_expiry: string | null
  batch_count: number
}

export type ProductRow = {
  id: string
  org_id: string
  barcode: string | null
  name: string
  brand: string | null
  image_url: string | null
  category: string | null
  default_unit: ProductUnit
  source: ProductSource
  supplier_id: string | null
  /** Réservé au food cost (hors MVP) — ne pas exposer dans l'UI. */
  unit_cost: number | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow
        Insert: { id: string } & Partial<Omit<ProfileRow, 'id'>>
        Update: Partial<ProfileRow>
        Relationships: []
      }
      organizations: {
        Row: OrganizationRow
        Insert: { name: string; owner_id: string } & Partial<
          Omit<OrganizationRow, 'name' | 'owner_id'>
        >
        Update: Partial<OrganizationRow>
        Relationships: []
      }
      establishments: {
        Row: EstablishmentRow
        Insert: { org_id: string; name: string } & Partial<
          Omit<EstablishmentRow, 'org_id' | 'name'>
        >
        Update: Partial<EstablishmentRow>
        Relationships: []
      }
      memberships: {
        Row: MembershipRow
        Insert: { org_id: string; user_id: string } & Partial<
          Omit<MembershipRow, 'org_id' | 'user_id'>
        >
        Update: Partial<MembershipRow>
        Relationships: []
      }
      products: {
        Row: ProductRow
        Insert: { org_id: string; name: string } & Partial<
          Omit<ProductRow, 'org_id' | 'name'>
        >
        Update: Partial<ProductRow>
        Relationships: []
      }
      stock_items: {
        Row: StockItemRow
        Insert: {
          establishment_id: string
          product_id: string
          unit: ProductUnit
        } & Partial<Omit<StockItemRow, 'establishment_id' | 'product_id' | 'unit'>>
        Update: Partial<StockItemRow>
        Relationships: []
      }
      suppliers: {
        Row: SupplierRow
        Insert: { org_id: string; name: string } & Partial<
          Omit<SupplierRow, 'org_id' | 'name'>
        >
        Update: Partial<SupplierRow>
        Relationships: []
      }
      order_lists: {
        Row: OrderListRow
        Insert: { establishment_id: string; name: string } & Partial<
          Omit<OrderListRow, 'establishment_id' | 'name'>
        >
        Update: Partial<OrderListRow>
        Relationships: []
      }
      order_list_items: {
        Row: OrderListItemRow
        Insert: {
          order_list_id: string
          product_id: string
          unit: ProductUnit
        } & Partial<Omit<OrderListItemRow, 'order_list_id' | 'product_id' | 'unit'>>
        Update: Partial<OrderListItemRow>
        Relationships: []
      }
      stock_presets: {
        Row: StockPresetRow
        Insert: { establishment_id: string; name: string } & Partial<StockPresetRow>
        Update: Partial<StockPresetRow>
        Relationships: []
      }
      stock_preset_items: {
        Row: StockPresetItemRow
        Insert: { preset_id: string } & Partial<StockPresetItemRow>
        Update: Partial<StockPresetItemRow>
        Relationships: []
      }
      push_subscriptions: {
        Row: PushSubscriptionRow
        Insert: {
          user_id: string
          establishment_id: string
          endpoint: string
          p256dh: string
          auth: string
        } & Partial<Omit<PushSubscriptionRow, 'user_id' | 'establishment_id' | 'endpoint' | 'p256dh' | 'auth'>>
        Update: Partial<PushSubscriptionRow>
        Relationships: []
      }
      invitations: {
        Row: InvitationRow
        Insert: { org_id: string; email: string } & Partial<
          Omit<InvitationRow, 'org_id' | 'email'>
        >
        Update: Partial<InvitationRow>
        Relationships: []
      }
      stock_batches: {
        Row: StockBatchRow
        Insert: {
          stock_item_id: string
          quantity: number
          expiry_date: string
        } & Partial<Omit<StockBatchRow, 'stock_item_id' | 'quantity' | 'expiry_date'>>
        Update: Partial<StockBatchRow>
        Relationships: []
      }
    }
    Views: {
      stock_overview: {
        Row: StockOverviewRow
        Relationships: []
      }
      order_list_items_view: {
        Row: OrderListItemView
        Relationships: []
      }
    }
    Functions: {
      create_organization_with_establishment: {
        Args: {
          p_org_name: string
          p_establishment_name: string
          p_cuisine_type?: string | null
          p_locations?: string[] | null
        }
        Returns: { org_id: string; establishment_id: string }[]
      }
      fill_order_from_low_stock: {
        Args: { p_order_list_id: string }
        Returns: number
      }
      claim_invitations: {
        Args: Record<string, never>
        Returns: number
      }
      add_to_stock: {
        Args: {
          p_establishment_id: string
          p_product_id: string
          p_quantity: number
          p_unit: ProductUnit
          p_location?: string
          p_min_threshold?: number | null
          p_expiry_date?: string | null
          p_target_quantity?: number | null
          p_alert_lead_days?: number | null
        }
        Returns: string
      }
      receive_order_list: {
        Args: { p_order_list_id: string }
        Returns: number
      }
    }
    Enums: {
      member_role: MemberRole
      product_unit: ProductUnit
      product_source: ProductSource
      order_status: OrderStatus
    }
    CompositeTypes: { [_ in never]: never }
  }
}
